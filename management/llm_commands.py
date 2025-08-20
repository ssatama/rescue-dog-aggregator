"""
LLM data service management commands.

Following CLAUDE.md principles:
- Pure functions, no mutations
- Early returns, no nested conditionals
- Immutable data patterns
- Clear error handling
"""

import asyncio
import json
import logging
import os
import sys
from typing import Optional, Tuple

import click
import psycopg2
from rich.console import Console
from rich.progress import Progress, SpinnerColumn, TextColumn
from rich.table import Table

# Add project root to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config import DB_CONFIG
from management.batch_processor import create_batch_processor
from services.llm.config import get_llm_config
from services.llm.models import ProcessingType
from services.llm_data_service import OpenRouterLLMDataService

console = Console()
logger = logging.getLogger(__name__)


@click.group()
def llm():
    """LLM data service management commands."""
    pass


@llm.command()
@click.option("--organization", "-o", help="Process only specific organization")
@click.option("--limit", "-l", default=None, type=int, help="Limit number of animals to process")
@click.option("--dry-run", is_flag=True, help="Show what would be processed without making changes")
@click.option("--force", is_flag=True, help="Process even if already enriched")
@click.option("--batch-size", "-b", default=25, type=int, help="Number of items to process per batch (default: 25)")
def enrich_descriptions(organization: Optional[str], limit: Optional[int], dry_run: bool, force: bool, batch_size: Optional[int]):
    """Enrich animal descriptions using LLM."""

    console.print("[bold cyan]Starting description enrichment...[/bold cyan]")

    # Connect to database
    conn = psycopg2.connect(**DB_CONFIG)
    cursor = conn.cursor()

    # Build query - only process dogs with high availability confidence
    query = """
        SELECT a.id, a.name, a.properties->>'description' as description, o.name as org_name
        FROM animals a
        JOIN organizations o ON a.organization_id = o.id
        WHERE a.status = 'available'
        AND a.availability_confidence = 'high'
    """

    conditions = []
    params = []

    if not force:
        conditions.append("a.enriched_description IS NULL")

    if organization:
        conditions.append("o.config_id = %s")
        params.append(organization)

    if conditions:
        query += " AND " + " AND ".join(conditions)

    query += " ORDER BY a.created_at DESC"

    if limit:
        query += " LIMIT %s"
        params.append(limit)

    cursor.execute(query, params)
    animals = cursor.fetchall()

    if not animals:
        console.print("[yellow]No animals found to process[/yellow]")
        return

    console.print(f"Found [bold green]{len(animals)}[/bold green] animals to process")

    if dry_run:
        # Show table of what would be processed
        table = Table(title="Animals to Process")
        table.add_column("ID", style="cyan")
        table.add_column("Name", style="magenta")
        table.add_column("Organization", style="green")
        table.add_column("Description", style="white", overflow="fold", max_width=50)

        for animal_id, name, description, org_name in animals[:10]:
            table.add_row(str(animal_id), name, org_name, description[:100] + "..." if description else "")

        console.print(table)

        if len(animals) > 10:
            console.print(f"[dim]... and {len(animals) - 10} more[/dim]")

        return

    # Load configuration
    llm_config = get_llm_config()

    # Use provided batch_size or config default
    effective_batch_size = batch_size or llm_config.batch.default_size

    # Initialize batch processor
    batch_processor = create_batch_processor(connection=conn, batch_size=effective_batch_size, max_retries=llm_config.retry.max_attempts, retry_delay=llm_config.retry.base_delay, commit_frequency=1)

    # Run async operations synchronously for Click compatibility
    asyncio.run(_enrich_descriptions_async(animals, effective_batch_size, batch_processor, llm_config))

    cursor.close()
    conn.close()

    console.print(f"\n[bold green]✓[/bold green] Processing complete")


async def _enrich_descriptions_async(animals, effective_batch_size, batch_processor, llm_config):
    """Async helper for description enrichment."""
    # Initialize LLM service
    async with OpenRouterLLMDataService() as llm_service:

        # Pre-process all animals to enrich descriptions
        enriched_animals = []

        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            console=console,
        ) as progress:

            # Step 1: LLM Processing
            llm_task = progress.add_task("Processing with LLM...", total=len(animals))

            for animal_id, name, description, org_name in animals:
                progress.update(llm_task, description=f"Processing {name}...")

                try:
                    if not description:
                        progress.advance(llm_task)
                        continue

                    # Clean description
                    enriched = await llm_service.clean_description(description, organization_config={"organization_name": org_name})

                    if enriched and enriched != description:
                        enriched_animals.append((animal_id, enriched))

                except Exception as e:
                    logger.error(f"Failed to process animal {animal_id}: {e}")

                progress.advance(llm_task)

            # Step 2: Batch Database Updates
            if enriched_animals:
                console.print(f"[bold green]✓[/bold green] LLM processing complete. Updating {len(enriched_animals)} records in database...")

                def create_update_query(item: Tuple[int, str]) -> Tuple[str, Tuple]:
                    animal_id, enriched_description = item
                    query = """
                        UPDATE animals 
                        SET enriched_description = %s,
                            llm_processed_at = CURRENT_TIMESTAMP,
                            llm_model_used = %s,
                            updated_at = CURRENT_TIMESTAMP
                        WHERE id = %s
                    """
                    return query, (enriched_description, llm_config.models.default_model, animal_id)

                db_task = progress.add_task("Updating database...", total=len(enriched_animals))

                batch_result = batch_processor.process_batch(enriched_animals, create_update_query, progress, db_task)

                success_count = batch_result.total_processed
                error_count = len(batch_result.errors)

                # Log batch processing results
                console.print(f"[bold blue]Batch Processing Results:[/bold blue]")
                console.print(f"  • Processing time: {batch_result.processing_time:.2f}s")
                console.print(f"  • Success rate: {batch_result.success_rate:.1f}%")
                console.print(f"  • Successful batches: {batch_result.successful_batches}")
                console.print(f"  • Failed batches: {batch_result.failed_batches}")

            else:
                success_count = 0
                error_count = 0

        console.print(f"\n[bold green]✓[/bold green] Processed {success_count} animals successfully")
        if error_count > 0:
            console.print(f"[bold red]✗[/bold red] Failed to process {error_count} animals")


@llm.command()
@click.option("--organization", "-o", help="Process only specific organization")
@click.option("--limit", "-l", default=None, type=int, help="Limit number of animals to process")
@click.option("--batch-size", "-b", default=25, type=int, help="Number of items to process per batch (default: 25)")
def generate_profiles(organization: Optional[str], limit: Optional[int], batch_size: Optional[int]):
    """Generate dog profiler data for matching feature."""

    console.print("[bold cyan]Starting dog profiler generation...[/bold cyan]")

    # Connect to database
    conn = psycopg2.connect(**DB_CONFIG)
    cursor = conn.cursor()

    # Build query - only process dogs with high availability confidence
    query = """
        SELECT a.id, a.name, a.breed, a.age_text, a.properties->>'description' as description, o.name as org_name
        FROM animals a
        JOIN organizations o ON a.organization_id = o.id
        WHERE a.status = 'available'
        AND a.availability_confidence = 'high'
        AND a.dog_profiler_data IS NULL
    """

    params = []

    if organization:
        query += " AND o.config_id = %s"
        params.append(organization)

    query += " ORDER BY a.created_at DESC"

    if limit:
        query += " LIMIT %s"
        params.append(limit)

    cursor.execute(query, params)
    animals = cursor.fetchall()

    if not animals:
        console.print("[yellow]No animals found to process[/yellow]")
        return

    console.print(f"Found [bold green]{len(animals)}[/bold green] animals to process")

    # Load configuration
    llm_config = get_llm_config()

    # Use provided batch_size or config default
    effective_batch_size = batch_size or llm_config.batch.default_size

    # Initialize batch processor
    batch_processor = create_batch_processor(connection=conn, batch_size=effective_batch_size, max_retries=llm_config.retry.max_attempts, retry_delay=llm_config.retry.base_delay, commit_frequency=1)

    # Run async operations synchronously for Click compatibility
    asyncio.run(_generate_profiles_async(animals, effective_batch_size, batch_processor, llm_config))

    cursor.close()
    conn.close()

    console.print(f"\n[bold green]✓[/bold green] Profile generation complete")


async def _generate_profiles_async(animals, effective_batch_size, batch_processor, llm_config):
    """Async helper for profile generation."""
    # Initialize LLM service
    async with OpenRouterLLMDataService() as llm_service:

        # Pre-process all animals to generate profiles
        profiled_animals = []

        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            console=console,
        ) as progress:

            # Step 1: LLM Processing
            llm_task = progress.add_task("Generating profiles with LLM...", total=len(animals))

            for animal_id, name, breed, age_text, description, org_name in animals:
                progress.update(llm_task, description=f"Generating profile for {name}...")

                try:
                    # Generate dog profiler data
                    profile_data = await llm_service.generate_dog_profiler({"name": name, "breed": breed, "age_text": age_text, "description": description})

                    if profile_data:
                        profiled_animals.append((animal_id, json.dumps(profile_data)))

                except Exception as e:
                    logger.error(f"Failed to generate profile for animal {animal_id}: {e}")

                progress.advance(llm_task)

            # Step 2: Batch Database Updates
            if profiled_animals:
                console.print(f"[bold green]✓[/bold green] Profile generation complete. Updating {len(profiled_animals)} records in database...")

                def create_update_query(item: Tuple[int, str]) -> Tuple[str, Tuple]:
                    animal_id, profile_json = item
                    query = """
                        UPDATE animals 
                        SET dog_profiler_data = %s,
                            llm_processed_at = CURRENT_TIMESTAMP,
                            llm_model_used = %s,
                            updated_at = CURRENT_TIMESTAMP
                        WHERE id = %s
                    """
                    return query, (profile_json, llm_config.models.default_model, animal_id)

                db_task = progress.add_task("Updating database...", total=len(profiled_animals))

                batch_result = batch_processor.process_batch(profiled_animals, create_update_query, progress, db_task)

                success_count = batch_result.total_processed
                error_count = len(batch_result.errors)

                # Log batch processing results
                console.print(f"[bold blue]Batch Processing Results:[/bold blue]")
                console.print(f"  • Processing time: {batch_result.processing_time:.2f}s")
                console.print(f"  • Success rate: {batch_result.success_rate:.1f}%")
                console.print(f"  • Successful batches: {batch_result.successful_batches}")
                console.print(f"  • Failed batches: {batch_result.failed_batches}")

            else:
                success_count = 0
                error_count = 0

        console.print(f"\n[bold green]✓[/bold green] Generated {success_count} profiles successfully")
        if error_count > 0:
            console.print(f"[bold red]✗[/bold red] Failed to generate {error_count} profiles")


@llm.command()
@click.option("--target-language", "-t", required=True, help="Target language code (es, fr, de, etc)")
@click.option("--organization", "-o", help="Process only specific organization")
@click.option("--limit", "-l", default=None, type=int, help="Limit number of animals to process")
@click.option("--batch-size", "-b", default=25, type=int, help="Number of items to process per batch (default: 25)")
def translate(target_language: str, organization: Optional[str], limit: Optional[int], batch_size: Optional[int]):
    """Translate animal descriptions to target language."""

    console.print(f"[bold cyan]Starting translation to {target_language}...[/bold cyan]")

    # Connect to database
    conn = psycopg2.connect(**DB_CONFIG)
    cursor = conn.cursor()

    # Build query - only process dogs with high availability confidence
    query = """
        SELECT a.id, a.name, a.properties->>'description' as description, o.name as org_name
        FROM animals a
        JOIN organizations o ON a.organization_id = o.id
        WHERE a.status = 'available'
        AND a.availability_confidence = 'high'
        AND a.properties->>'description' IS NOT NULL
    """

    params = []

    if organization:
        query += " AND o.config_id = %s"
        params.append(organization)

    query += " ORDER BY a.created_at DESC"

    if limit:
        query += " LIMIT %s"
        params.append(limit)

    cursor.execute(query, params)
    animals = cursor.fetchall()

    if not animals:
        console.print("[yellow]No animals found to translate[/yellow]")
        return

    console.print(f"Found [bold green]{len(animals)}[/bold green] animals to translate")

    # Load configuration
    llm_config = get_llm_config()

    # Use provided batch_size or config default
    effective_batch_size = batch_size or llm_config.batch.default_size

    # Initialize batch processor
    batch_processor = create_batch_processor(connection=conn, batch_size=effective_batch_size, max_retries=llm_config.retry.max_attempts, retry_delay=llm_config.retry.base_delay, commit_frequency=1)

    # Run async operations synchronously for Click compatibility
    asyncio.run(_translate_async(animals, target_language, effective_batch_size, batch_processor, llm_config, conn))

    cursor.close()
    conn.close()

    console.print(f"\n[bold green]✓[/bold green] Translation complete")


async def _translate_async(animals, target_language, effective_batch_size, batch_processor, llm_config, conn):
    """Async helper for translation."""
    cursor = conn.cursor()
    # Initialize LLM service
    async with OpenRouterLLMDataService() as llm_service:

        # Pre-process all animals to translate descriptions
        translated_animals = []

        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            console=console,
        ) as progress:

            # Step 1: LLM Processing
            llm_task = progress.add_task("Translating with LLM...", total=len(animals))

            for animal_id, name, description, org_name in animals:
                progress.update(llm_task, description=f"Translating for {name}...")

                try:
                    # Translate description
                    translated = await llm_service.translate_text(description, target_language=target_language)

                    if translated:
                        # Get existing translations
                        cursor.execute("SELECT translations FROM animals WHERE id = %s", (animal_id,))
                        result = cursor.fetchone()
                        translations = result[0] if result and result[0] else {}

                        # Add new translation
                        translations[target_language] = translated
                        translated_animals.append((animal_id, json.dumps(translations)))

                except Exception as e:
                    logger.error(f"Failed to translate for animal {animal_id}: {e}")

                progress.advance(llm_task)

            # Step 2: Batch Database Updates
            if translated_animals:
                console.print(f"[bold green]✓[/bold green] Translation complete. Updating {len(translated_animals)} records in database...")

                def create_update_query(item: Tuple[int, str]) -> Tuple[str, Tuple]:
                    animal_id, translations_json = item
                    query = """
                        UPDATE animals 
                        SET translations = %s,
                            updated_at = CURRENT_TIMESTAMP
                        WHERE id = %s
                    """
                    return query, (translations_json, animal_id)

                db_task = progress.add_task("Updating database...", total=len(translated_animals))

                batch_result = batch_processor.process_batch(translated_animals, create_update_query, progress, db_task)

                success_count = batch_result.total_processed
                error_count = len(batch_result.errors)

                # Log batch processing results
                console.print(f"[bold blue]Batch Processing Results:[/bold blue]")
                console.print(f"  • Processing time: {batch_result.processing_time:.2f}s")
                console.print(f"  • Success rate: {batch_result.success_rate:.1f}%")
                console.print(f"  • Successful batches: {batch_result.successful_batches}")
                console.print(f"  • Failed batches: {batch_result.failed_batches}")

            else:
                success_count = 0
                error_count = 0

        console.print(f"\n[bold green]✓[/bold green] Translated {success_count} animals successfully")
        if error_count > 0:
            console.print(f"[bold red]✗[/bold red] Failed to translate {error_count} animals")


@llm.command()
def stats():
    """Show LLM processing statistics."""

    conn = psycopg2.connect(**DB_CONFIG)
    cursor = conn.cursor()

    # Get overall stats (for high confidence available dogs)
    cursor.execute(
        """
        SELECT 
            COUNT(*) as total,
            COUNT(enriched_description) as enriched,
            COUNT(dog_profiler_data) as with_profiles,
            COUNT(translations) as with_translations
        FROM animals
        WHERE status = 'available'
        AND availability_confidence = 'high'
    """
    )

    total, enriched, with_profiles, with_translations = cursor.fetchone()

    # Create table
    table = Table(title="LLM Processing Statistics (High Confidence Available Dogs)")
    table.add_column("Metric", style="cyan")
    table.add_column("Count", style="magenta")
    table.add_column("Percentage", style="green")

    table.add_row("Total High Confidence Dogs", str(total), "100%")
    table.add_row("Enriched Descriptions", str(enriched), f"{enriched/total*100:.1f}%")
    table.add_row("Dog Profiles", str(with_profiles), f"{with_profiles/total*100:.1f}%")
    table.add_row("With Translations", str(with_translations), f"{with_translations/total*100:.1f}%")

    console.print(table)

    # Get per-organization stats (for high confidence available dogs)
    cursor.execute(
        """
        SELECT 
            o.name,
            COUNT(a.id) as total,
            COUNT(a.enriched_description) as enriched
        FROM organizations o
        LEFT JOIN animals a ON a.organization_id = o.id 
            AND a.status = 'available'
            AND a.availability_confidence = 'high'
        GROUP BY o.id, o.name
        ORDER BY total DESC
    """
    )

    org_table = Table(title="Per-Organization Statistics (High Confidence Dogs)")
    org_table.add_column("Organization", style="cyan")
    org_table.add_column("Total", style="magenta")
    org_table.add_column("Enriched", style="green")
    org_table.add_column("Coverage", style="yellow")

    for org_name, total, enriched in cursor.fetchall():
        if total > 0:
            coverage = f"{enriched/total*100:.1f}%"
        else:
            coverage = "N/A"
        org_table.add_row(org_name, str(total), str(enriched), coverage)

    console.print("\n")
    console.print(org_table)

    cursor.close()
    conn.close()


if __name__ == "__main__":
    # All commands are now synchronous
    llm()
