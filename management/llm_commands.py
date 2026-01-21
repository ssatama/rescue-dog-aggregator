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

# ProcessingType import removed - was unused
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
@click.option(
    "--dry-run",
    is_flag=True,
    help="Show what would be processed without making changes",
)
@click.option("--force", is_flag=True, help="Process even if already enriched")
@click.option(
    "--batch-size",
    "-b",
    default=25,
    type=int,
    help="Number of items to process per batch (default: 25)",
)
def enrich_descriptions(
    organization: str | None,
    limit: int | None,
    dry_run: bool,
    force: bool,
    batch_size: int | None,
):
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
            table.add_row(
                str(animal_id),
                name,
                org_name,
                description[:100] + "..." if description else "",
            )

        console.print(table)

        if len(animals) > 10:
            console.print(f"[dim]... and {len(animals) - 10} more[/dim]")

        return

    # Load configuration
    llm_config = get_llm_config()

    # Use provided batch_size or config default
    effective_batch_size = batch_size or llm_config.batch.default_size

    # Initialize batch processor
    batch_processor = create_batch_processor(
        connection=conn,
        batch_size=effective_batch_size,
        max_retries=llm_config.retry.max_attempts,
        retry_delay=llm_config.retry.base_delay,
        commit_frequency=1,
    )

    # Run async operations synchronously for Click compatibility
    asyncio.run(_enrich_descriptions_async(animals, effective_batch_size, batch_processor, llm_config))

    cursor.close()
    conn.close()

    console.print("\n[bold green]✓[/bold green] Processing complete")


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

                def create_update_query(item: tuple[int, str]) -> tuple[str, tuple]:
                    animal_id, enriched_description = item
                    query = """
                        UPDATE animals
                        SET enriched_description = %s,
                            updated_at = CURRENT_TIMESTAMP
                        WHERE id = %s
                    """
                    return query, (enriched_description, animal_id)

                db_task = progress.add_task("Updating database...", total=len(enriched_animals))

                batch_result = batch_processor.process_batch(enriched_animals, create_update_query, progress, db_task)

                success_count = batch_result.total_processed
                error_count = len(batch_result.errors)

                # Log batch processing results
                console.print("[bold blue]Batch Processing Results:[/bold blue]")
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
@click.option("--organization", "-o", type=int, help="Process only specific organization ID")
@click.option(
    "--limit",
    "-l",
    default=None,
    type=int,
    help="Limit number of animals to process per organization",
)
@click.option(
    "--batch-size",
    "-b",
    default=10,
    type=int,
    help="Number of items to process per batch (default: 10)",
)
def generate_profiles(organization: int | None, limit: int | None, batch_size: int):
    """Generate dog profiler data using org-specific prompts."""
    from services.llm.dog_profiler import DogProfilerPipeline
    from services.llm.organization_config_loader import get_config_loader

    console.print("[bold cyan]Starting dog profiler generation with org-specific prompts...[/bold cyan]")

    conn = psycopg2.connect(**DB_CONFIG)
    cursor = conn.cursor()

    loader = get_config_loader()
    supported_orgs = loader.get_supported_organizations()

    if organization:
        org_ids = [organization] if organization in supported_orgs else []
        if not org_ids:
            console.print(f"[red]Organization {organization} not configured for LLM profiling[/red]")
            console.print(f"Available: {supported_orgs}")
            return
    else:
        org_ids = supported_orgs

    total_processed = 0
    total_successful = 0

    for org_id in org_ids:
        org_config = loader.load_config(org_id)
        if not org_config or not org_config.enabled:
            continue

        console.print(f"\n[bold blue]Processing {org_config.organization_name} (ID: {org_id})[/bold blue]")
        console.print(f"  Model: {org_config.model_preference}")

        query = """
            SELECT id, name, breed, age_text, properties
            FROM animals
            WHERE organization_id = %s
            AND (dog_profiler_data IS NULL OR dog_profiler_data = '{}')
            AND availability_confidence = 'high'
            AND status = 'available'
            ORDER BY id DESC
        """
        if limit:
            query += f" LIMIT {limit}"

        cursor.execute(query, (org_id,))
        dogs = [
            {
                "id": r[0],
                "name": r[1],
                "breed": r[2],
                "age_text": r[3],
                "properties": r[4],
            }
            for r in cursor.fetchall()
        ]

        if not dogs:
            console.print("  [yellow]No dogs need profiling[/yellow]")
            continue

        console.print(f"  Found [green]{len(dogs)}[/green] dogs to profile")

        pipeline = DogProfilerPipeline(organization_id=org_id)
        results = asyncio.run(pipeline.process_batch(dogs, batch_size=batch_size))

        if results:
            asyncio.run(pipeline.save_results(results))

        stats = pipeline.get_statistics()
        console.print(f"  ✓ Processed: {stats['processed']}, Successful: {stats['successful']} ({stats['success_rate']:.1f}%)")

        total_processed += stats["processed"]
        total_successful += stats["successful"]

    cursor.close()
    conn.close()

    console.print(f"\n[bold green]✓ Total: {total_successful}/{total_processed} profiles generated[/bold green]")


@llm.command()
@click.option(
    "--target-language",
    "-t",
    required=True,
    help="Target language code (es, fr, de, etc)",
)
@click.option("--organization", "-o", help="Process only specific organization")
@click.option("--limit", "-l", default=None, type=int, help="Limit number of animals to process")
@click.option(
    "--batch-size",
    "-b",
    default=25,
    type=int,
    help="Number of items to process per batch (default: 25)",
)
def translate(
    target_language: str,
    organization: str | None,
    limit: int | None,
    batch_size: int | None,
):
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
    batch_processor = create_batch_processor(
        connection=conn,
        batch_size=effective_batch_size,
        max_retries=llm_config.retry.max_attempts,
        retry_delay=llm_config.retry.base_delay,
        commit_frequency=1,
    )

    # Run async operations synchronously for Click compatibility
    asyncio.run(
        _translate_async(
            animals,
            target_language,
            effective_batch_size,
            batch_processor,
            llm_config,
            conn,
        )
    )

    cursor.close()
    conn.close()

    console.print("\n[bold green]✓[/bold green] Translation complete")


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
                        cursor.execute(
                            "SELECT translations FROM animals WHERE id = %s",
                            (animal_id,),
                        )
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

                def create_update_query(item: tuple[int, str]) -> tuple[str, tuple]:
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
                console.print("[bold blue]Batch Processing Results:[/bold blue]")
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
    table.add_row("Enriched Descriptions", str(enriched), f"{enriched / total * 100:.1f}%")
    table.add_row("Dog Profiles", str(with_profiles), f"{with_profiles / total * 100:.1f}%")
    table.add_row(
        "With Translations",
        str(with_translations),
        f"{with_translations / total * 100:.1f}%",
    )

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
            coverage = f"{enriched / total * 100:.1f}%"
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
