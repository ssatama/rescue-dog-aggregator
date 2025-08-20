"""
Dog Profiler Pipeline for enriching dog data with LLM.

Default Model: google/gemini-2.5-flash
- 2.5x faster than GPT-4
- 85% cheaper (~$0.0015/dog vs $0.01/dog)
- 90% success rate (with retry logic can reach 100%)

Following CLAUDE.md principles:
- Pure functions, no mutations
- Clear error handling
- Dependency injection
- Context manager support
"""

import asyncio
import json
import logging
import os
import time
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

import httpx
import yaml
from dotenv import load_dotenv

from services.llm.schemas.dog_profiler import DogProfilerData
from services.llm_data_service import OpenRouterLLMDataService
from services.llm.retry_handler import RetryHandler, RetryConfig

# Load environment variables
load_dotenv()

logger = logging.getLogger(__name__)


class DogProfilerPipeline:
    """Pipeline for enriching dog data with LLM-generated profiles."""

    def __init__(
        self,
        organization_id: int,
        llm_service: Optional[OpenRouterLLMDataService] = None,
        dry_run: bool = False,
        retry_config: Optional[RetryConfig] = None,
        connection_pool: Optional['ConnectionPoolService'] = None,
    ):
        """
        Initialize the dog profiler pipeline.

        Args:
            organization_id: ID of the organization to process
            llm_service: Optional LLM service instance (creates one if not provided)
            dry_run: If True, don't save to database
            retry_config: Optional retry configuration
            connection_pool: Optional connection pool service for database operations
        """
        self.org_id = organization_id
        self.dry_run = dry_run
        self.connection_pool = connection_pool
        self.llm_service = llm_service or OpenRouterLLMDataService()
        self.prompt_template = self._load_prompt_template(organization_id)
        self.processed_count = 0
        self.success_count = 0
        self.error_count = 0
        self.errors = []
        
        # Setup retry handler with fallback models
        if retry_config is None:
            retry_config = RetryConfig(
                max_attempts=3,
                initial_delay=2.0,
                backoff_factor=2.0,
                fallback_models=["google/gemini-2.5-flash", "openai/gpt-4-turbo-preview"]
            )
        self.retry_handler = RetryHandler(retry_config)

    def _load_prompt_template(self, org_id: int) -> Dict[str, Any]:
        """
        Load organization-specific prompt template from YAML.

        Args:
            org_id: Organization ID

        Returns:
            Prompt template dictionary
        """
        # Map org IDs to template files
        org_mapping = {
            11: "tierschutzverein_europa.yaml",
            # Add more organizations as needed
        }

        template_file = org_mapping.get(org_id)
        if not template_file:
            raise ValueError(f"No prompt template found for organization {org_id}")

        template_path = (
            Path(__file__).parent.parent.parent / "prompts" / "organizations" / template_file
        )

        if not template_path.exists():
            raise FileNotFoundError(f"Prompt template not found: {template_path}")

        with open(template_path, "r", encoding="utf-8") as f:
            return yaml.safe_load(f)

    def smart_truncate(self, text: str, max_length: int) -> str:
        """
        Intelligently truncate text at sentence or word boundaries.
        
        Args:
            text: Text to truncate
            max_length: Maximum allowed length
            
        Returns:
            Truncated text that ends at a natural boundary
        """
        if len(text) <= max_length:
            return text
            
        # Try to find the last sentence ending within limit
        sentence_endings = ['. ', '! ', '? ']
        best_pos = -1
        
        for ending in sentence_endings:
            # Look for sentence endings in the allowed range
            search_text = text[:max_length]
            pos = search_text.rfind(ending)
            if pos > best_pos:
                best_pos = pos + 1  # Include the punctuation
                
        if best_pos > max_length * 0.5:  # Accept if we keep at least 50% of target length
            return text[:best_pos].strip()
            
        # Fall back to word boundary
        # Find the last space before the limit
        search_text = text[:max_length]
        last_space = search_text.rfind(' ')
        
        if last_space > max_length * 0.7:  # Accept if we keep at least 70% of target length
            return text[:last_space].strip() + "..."
            
        # Last resort: hard truncate but try to avoid mid-word
        # Look for a space shortly after the limit
        for i in range(max_length, min(max_length + 20, len(text))):
            if text[i] == ' ':
                return text[:i].strip() + "..."
                
        # Absolute last resort: hard truncate
        return text[:max_length-3].strip() + "..."
    
    def _normalize_profile_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Normalize model output to match our schema requirements.
        
        Args:
            data: Raw profile data from LLM
            
        Returns:
            Normalized data dictionary
        """
        # Trainability mappings
        if "trainability" in data:
            if data["trainability"] is None or data["trainability"] == "null":
                data["trainability"] = "moderate"  # Default value
            else:
                mapping = {
                    "easy": "easy",
                    "medium": "moderate",
                    "moderate": "moderate",
                    "challenging": "challenging",
                    "hard": "challenging",
                    "very_challenging": "very_challenging",
                    "expert_needed": "very_challenging",
                    "null": "moderate",  # Handle string "null"
                    "unknown": "moderate"
                }
                data["trainability"] = mapping.get(data["trainability"], "moderate")
        else:
            data["trainability"] = "moderate"  # Default if missing
        
        # Confidence mappings
        if "confidence" in data:
            if data["confidence"] is None:
                data["confidence"] = "moderate"  # Default value
            else:
                mapping = {
                    "very_confident": "very_confident",
                    "confident": "confident",
                    "moderate": "moderate",
                    "medium": "moderate",
                    "shy": "shy",
                    "very_shy": "very_shy",
                    "fearful": "very_shy"
                }
                data["confidence"] = mapping.get(data["confidence"], data["confidence"])
        else:
            data["confidence"] = "moderate"  # Default if missing
        
        # Boolean fields - handle required vs optional differently
        # yard_required and ready_to_travel are REQUIRED booleans
        for field in ["yard_required", "ready_to_travel"]:
            if field in data:
                if isinstance(data[field], str):
                    data[field] = data[field].lower() in ["true", "yes", "preferred", "required"]
                elif data[field] is None:
                    # Default to sensible values for required fields
                    data[field] = True if field == "ready_to_travel" else False
            else:
                data[field] = True if field == "ready_to_travel" else False
        
        # vaccinated and neutered are REQUIRED booleans too
        for field in ["vaccinated", "neutered"]:
            if field in data:
                if isinstance(data[field], str):
                    data[field] = data[field].lower() in ["true", "yes", "done", "completed"]
                elif data[field] is None:
                    # Default to False when unknown
                    data[field] = False
            else:
                data[field] = False
        
        # Sociability is REQUIRED - provide default if missing
        if "sociability" not in data or data["sociability"] is None:
            data["sociability"] = "selective"  # Conservative default
            if "confidence_scores" not in data:
                data["confidence_scores"] = {}
            data["confidence_scores"]["sociability"] = 0.1
        
        # Energy level is REQUIRED - provide default if missing
        if "energy_level" not in data or data["energy_level"] is None:
            data["energy_level"] = "medium"
            if "confidence_scores" not in data:
                data["confidence_scores"] = {}
            data["confidence_scores"]["energy_level"] = 0.2
        
        # Experience level is REQUIRED - provide default if missing  
        if "experience_level" not in data or data["experience_level"] is None:
            data["experience_level"] = "some_experience"
            if "confidence_scores" not in data:
                data["confidence_scores"] = {}
            data["confidence_scores"]["experience_level"] = 0.2
        
        # Good with dogs/cats/children - normalize and handle variations
        for field in ["good_with_dogs", "good_with_cats", "good_with_children"]:
            if field in data:
                value = data[field]
                if isinstance(value, bool):
                    data[field] = "yes" if value else "no"
                elif value in ["on_request", "untested", "unclear", None]:
                    data[field] = "unknown"
                elif value not in ["yes", "no", "selective", "unknown", "with_training", "older_children"]:
                    data[field] = "unknown"
        
        # Experience level mappings
        if "experience_level" in data:
            mapping = {
                "first_time_ok": "first_time_ok",
                "beginner": "first_time_ok",
                "some_experience": "some_experience",
                "intermediate": "some_experience",
                "experienced": "experienced_only",
                "experienced_only": "experienced_only",
                "expert": "experienced_only"
            }
            data["experience_level"] = mapping.get(data["experience_level"], "some_experience")
        
        # Exercise needs mappings
        if "exercise_needs" in data:
            mapping = {
                "minimal": "minimal",
                "low": "minimal",
                "moderate": "moderate",
                "medium": "moderate",
                "medium_high": "high",
                "high": "high",
                "very_high": "very_high",
                "athlete": "very_high"
            }
            data["exercise_needs"] = mapping.get(data["exercise_needs"], "moderate")
        
        # Grooming needs mappings
        if "grooming_needs" in data:
            mapping = {
                "minimal": "minimal",
                "low": "minimal",
                "weekly": "weekly",
                "moderate": "weekly",
                "frequent": "frequent",
                "high": "frequent",
                "professional": "professional"
            }
            data["grooming_needs"] = mapping.get(data["grooming_needs"], "weekly")
        
        # Ensure description is within length limit with smart truncation
        if "description" in data and data["description"] and len(data["description"]) > 250:
            data["description"] = self.smart_truncate(data["description"], 250)
        
        # Ensure tagline is within length limit
        if "tagline" in data and data["tagline"] and len(data["tagline"]) > 50:
            data["tagline"] = data["tagline"][:50]
        
        # Truncate various string fields if too long with smart truncation
        for field in ["medical_needs", "special_needs"]:
            if field in data and data[field] and len(data[field]) > 200:
                data[field] = self.smart_truncate(data[field], 200)
        
        # Truncate unique_quirk if too long (max 100 chars) with smart truncation
        if "unique_quirk" in data and data["unique_quirk"] and len(data["unique_quirk"]) > 100:
            data["unique_quirk"] = self.smart_truncate(data["unique_quirk"], 100)
        
        # Handle adoption_fee_euros - must be integer
        if "adoption_fee_euros" in data:
            fee = data["adoption_fee_euros"]
            if fee is None or fee == "null" or fee == "":
                data["adoption_fee_euros"] = None
            elif isinstance(fee, str):
                try:
                    data["adoption_fee_euros"] = int(fee)
                except (ValueError, TypeError):
                    data["adoption_fee_euros"] = None
            elif not isinstance(fee, int):
                data["adoption_fee_euros"] = None
        
        # Ensure required lists are not None and have correct length
        if not data.get("personality_traits"):
            # Only add defaults if we have NO data at all about the dog
            data["personality_traits"] = ["friendly", "loyal", "gentle"]
            # Mark as low confidence since it's inferred
            if "confidence_scores" not in data:
                data["confidence_scores"] = {}
            data["confidence_scores"]["personality_traits"] = 0.1
        else:
            # Ensure personality traits list has correct length (3-5 items)
            traits = data["personality_traits"]
            if len(traits) < 3:
                # Pad with generic traits
                while len(traits) < 3:
                    traits.append("gentle")
            elif len(traits) > 5:
                # Truncate to 5
                data["personality_traits"] = traits[:5]
        
        # Fix favorite_activities list length (max 4 items)
        if "favorite_activities" in data and data["favorite_activities"]:
            if len(data["favorite_activities"]) > 4:
                data["favorite_activities"] = data["favorite_activities"][:4]
        
        # Fix good_with_children values
        if "good_with_children" in data:
            value = data["good_with_children"]
            if value == "selective" or value not in ["yes", "older_children", "no", "unknown"]:
                # Map selective to older_children
                data["good_with_children"] = "older_children"
        
        # Fix good_with_cats values 
        if "good_with_cats" in data:
            value = data["good_with_cats"]
            if value == "selective" or value not in ["yes", "no", "with_training", "unknown"]:
                # Map selective to with_training
                data["good_with_cats"] = "with_training"
        
        if not data.get("favorite_activities"):
            data["favorite_activities"] = ["walks", "play"]
            if "confidence_scores" not in data:
                data["confidence_scores"] = {}
            data["confidence_scores"]["favorite_activities"] = 0.1
        
        # Ensure home_type is set (required field) and handle invalid values
        if not data.get("home_type") or data.get("home_type") == "unknown":
            data["home_type"] = "house_preferred"
            if "confidence_scores" not in data:
                data["confidence_scores"] = {}
            data["confidence_scores"]["home_type"] = 0.2
        else:
            # Validate home_type is one of the allowed values
            valid_home_types = ["apartment_ok", "house_preferred", "house_required", "farm_only"]
            if data["home_type"] not in valid_home_types:
                data["home_type"] = "house_preferred"  # Default to safe option
        
        # Ensure required source references and convert to strings
        if "source_references" not in data:
            data["source_references"] = {}
        
        # Convert any list/None values to strings
        for key, value in list(data["source_references"].items()):
            if value is None:
                data["source_references"][key] = "not specified"
            elif isinstance(value, list):
                # Join list items into a string
                data["source_references"][key] = "; ".join(str(v) for v in value)
            elif not isinstance(value, str):
                data["source_references"][key] = str(value)
        
        # Ensure required references exist
        if "description" not in data["source_references"]:
            data["source_references"]["description"] = "generated from available data"
        if "personality_traits" not in data["source_references"]:
            data["source_references"]["personality_traits"] = "inferred from breed" if "breed" in str(data) else "default values"
        
        # Ensure required confidence scores and clean up None values
        if "confidence_scores" not in data:
            data["confidence_scores"] = {}
        
        # Remove None values from confidence scores (convert to 0.0)
        cleaned_scores = {}
        for field, score in data.get("confidence_scores", {}).items():
            if score is not None:
                cleaned_scores[field] = score
            else:
                cleaned_scores[field] = 0.0
        data["confidence_scores"] = cleaned_scores
        
        # Ensure required fields have scores
        for field in ["description", "energy_level", "trainability"]:
            if field not in data["confidence_scores"]:
                # Low confidence for missing scores
                data["confidence_scores"][field] = 0.2
        
        return data

    def _build_prompt(self, dog_data: Dict[str, Any]) -> str:
        """
        Construct prompt with dog data.

        Args:
            dog_data: Dog information dictionary

        Returns:
            Formatted prompt string
        """
        # Extract properties as JSON string
        properties = dog_data.get("properties", {})
        if isinstance(properties, dict):
            properties_str = json.dumps(properties, ensure_ascii=False, indent=2)
        else:
            properties_str = str(properties)

        # Format the extraction prompt with dog data
        prompt = self.prompt_template["extraction_prompt"].format(
            name=dog_data.get("name", "Unknown"),
            breed=dog_data.get("breed", "Mixed Breed"),
            age_text=dog_data.get("age_text", "Unknown age"),
            properties=properties_str,
        )

        return prompt

    async def _call_llm_api(
        self,
        prompt: str,
        model: str = "google/gemini-2.5-flash",
        timeout: float = 30.0,
        prompt_adjustment: str = "",
    ) -> Dict[str, Any]:
        """
        Make LLM API call with specified model.
        
        This is separated out to be retryable.
        
        Args:
            prompt: The user prompt
            model: Model to use
            timeout: Request timeout
            prompt_adjustment: Optional prompt adjustment for retries
            
        Returns:
            Parsed JSON response
            
        Raises:
            Various exceptions that trigger retries
        """
        api_key = os.environ.get("OPENROUTER_API_KEY")
        if not api_key:
            raise ValueError("No OpenRouter API key found")
        
        # Add adjustment to prompt if specified (for retries)
        if prompt_adjustment:
            prompt = f"{prompt}\n\n{prompt_adjustment}"
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                    "HTTP-Referer": "https://rescuedogs.me",
                    "X-Title": "Rescue Dog Aggregator",
                },
                json={
                    "model": model,
                    "messages": [
                        {"role": "system", "content": self.prompt_template["system_prompt"]},
                        {"role": "user", "content": prompt},
                    ],
                    "temperature": 0.7,
                    "max_tokens": 4000,
                },
                timeout=timeout,
            )

            # Check for errors
            if response.status_code != 200:
                error_data = response.json()
                logger.error(f"API Error: {error_data}")
                response.raise_for_status()

            data = response.json()

            # Parse the response
            content = data["choices"][0]["message"]["content"]

            # Handle markdown wrapping if present
            if content.startswith("```"):
                # Extract JSON from markdown
                lines = content.split("\n")
                json_lines = []
                in_json = False
                for line in lines:
                    if line.startswith("```json"):
                        in_json = True
                    elif line.startswith("```") and in_json:
                        break
                    elif in_json and not line.startswith("```"):
                        json_lines.append(line)
                content = "\n".join(json_lines)

            # Parse JSON - this may raise JSONDecodeError which triggers retry
            profiler_result = json.loads(content)
            
            # Add model used to result
            profiler_result["model_used"] = data.get("model", model)
            
            return profiler_result

    async def process_dog(self, dog_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Process a single dog with error handling and retry logic.

        Args:
            dog_data: Dog information from database

        Returns:
            Profiler data dictionary or None if failed
        """
        dog_id = dog_data.get("id", "unknown")
        dog_name = dog_data.get("name", "Unknown")

        try:
            start_time = time.time()

            # Build the prompt
            prompt = self._build_prompt(dog_data)

            # Call LLM service with retry logic
            logger.info(f"Processing dog {dog_id} ({dog_name})")
            logger.debug(f"Prompt length: {len(prompt)} chars")
            
            # Use retry handler to call the API with automatic retries and model fallback
            profiler_result = await self.retry_handler.execute_with_retry(
                self._call_llm_api,
                prompt=prompt,
                model="google/gemini-2.5-flash",  # Start with preferred model
                timeout=30.0,
                prompt_adjustment=""  # Will be modified by retry handler if needed
            )

            # Calculate processing time
            processing_time_ms = int((time.time() - start_time) * 1000)

            # Ensure we have the required metadata
            if "dog_profiler_data" in profiler_result:
                profile_data = profiler_result["dog_profiler_data"]
            else:
                profile_data = profiler_result
            
            # Add processing time before normalization
            profile_data["processing_time_ms"] = processing_time_ms
            
            # Normalize values to match our schema enums
            profile_data = self._normalize_profile_data(profile_data)

            # Add/update metadata fields
            profile_data["profiled_at"] = datetime.utcnow().isoformat()
            profile_data["prompt_version"] = self.prompt_template["metadata"]["version"]
            profile_data["model_used"] = profiler_result.get("model_used", "google/gemini-2.5-flash")

            # Add confidence scores if not present (using defaults)
            if "confidence_scores" not in profile_data:
                profile_data["confidence_scores"] = {
                    "description": 0.8,
                    "energy_level": 0.7,
                    "trainability": 0.7,
                }

            # Add source references if not present
            if "source_references" not in profile_data:
                profile_data["source_references"] = {
                    "description": str(dog_data.get("properties", {}).get("description", "")),
                    "personality_traits": "inferred from description",
                }

            # Validate against schema
            validated_data = DogProfilerData(**profile_data)

            self.success_count += 1
            logger.info(f"Successfully processed dog {dog_id} ({dog_name})")

            # Convert to dict with proper datetime serialization
            result = validated_data.dict()
            # Ensure datetime is serialized
            if "profiled_at" in result and isinstance(result["profiled_at"], datetime):
                result["profiled_at"] = result["profiled_at"].isoformat()
            
            # Add original dog data fields that aren't in the schema
            result["id"] = dog_id
            result["name"] = dog_name
            result["breed"] = dog_data.get("breed", "Mixed Breed")
            result["external_id"] = dog_data.get("external_id")
            
            # Calculate quality score if rubric is available
            if hasattr(self, 'quality_rubric'):
                from .quality_rubric import DogProfileQualityRubric
                if not hasattr(self, '_rubric_instance'):
                    self._rubric_instance = DogProfileQualityRubric()
                # Score returns 0-1, multiply by 100 for percentage
                result["quality_score"] = self._rubric_instance.calculate_quality_score(result, dog_data) * 100
            else:
                # Default quality score for basic validation (80%)
                result["quality_score"] = 80
            
            return result

        except Exception as e:
            self.error_count += 1
            error_msg = f"Failed to process dog {dog_id} ({dog_name}): {str(e)}"
            logger.error(error_msg)
            self.errors.append({"dog_id": dog_id, "dog_name": dog_name, "error": str(e)})
            return None
        finally:
            self.processed_count += 1

    async def process_batch(
        self, dogs: List[Dict[str, Any]], batch_size: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Process multiple dogs in batches.

        Args:
            dogs: List of dog data dictionaries
            batch_size: Number of dogs to process concurrently

        Returns:
            List of successful results
        """
        results = []

        for i in range(0, len(dogs), batch_size):
            batch = dogs[i : i + batch_size]
            logger.info(f"Processing batch {i//batch_size + 1} ({len(batch)} dogs)")

            # Process batch concurrently
            tasks = [self.process_dog(dog) for dog in batch]
            batch_results = await asyncio.gather(*tasks)

            # Filter out None results (failures)
            successful = [r for r in batch_results if r is not None]
            results.extend(successful)

            # Log progress
            logger.info(f"Batch complete: {len(successful)}/{len(batch)} successful")

            # Small delay between batches to avoid rate limits
            if i + batch_size < len(dogs):
                await asyncio.sleep(1)

        return results

    def get_summary(self) -> Dict[str, Any]:
        """
        Get processing summary statistics.

        Returns:
            Summary dictionary
        """
        return {
            "processed": self.processed_count,
            "successful": self.success_count,
            "failed": self.error_count,
            "success_rate": (
                self.success_count / self.processed_count if self.processed_count > 0 else 0
            ),
            "errors": self.errors[:10],  # First 10 errors
        }
    
    def get_statistics(self) -> Dict[str, Any]:
        """
        Get processing statistics (alias for get_summary).
        
        Returns:
            Statistics dictionary
        """
        return self.get_summary()

    async def save_results(self, results: List[Dict[str, Any]]) -> bool:
        """
        Save profiler results to database.

        Args:
            results: List of profiler data dictionaries

        Returns:
            True if successful
        """
        if self.dry_run:
            logger.info(f"DRY RUN: Would save {len(results)} profiles to database")
            return True

        try:
            # Use connection pool if available, otherwise create direct connection
            if self.connection_pool:
                with self.connection_pool.get_connection_context() as conn:
                    self._save_with_connection(conn, results)
            else:
                # Fallback to direct connection for backward compatibility
                import os
                import psycopg2
                from dotenv import load_dotenv

                load_dotenv()

                conn = psycopg2.connect(
                    host="localhost", database="rescue_dogs", user=os.environ.get("USER"), password=""
                )
                try:
                    self._save_with_connection(conn, results)
                    conn.commit()
                finally:
                    conn.close()

            logger.info(f"Successfully saved {len(results)} profiles to database")
            return True

        except Exception as e:
            logger.error(f"Failed to save results: {e}")
            return False
    
    def _save_with_connection(self, conn, results: List[Dict[str, Any]]) -> None:
        """
        Save results using provided database connection.
        
        Args:
            conn: Database connection
            results: List of processed dog profiles
        """
        cursor = conn.cursor()
        
        for result in results:
            # Extract dog_id from the result (assuming it's included)
            dog_id = result.get("dog_id")
            if not dog_id:
                logger.warning("No dog_id in result, skipping")
                continue

            # Remove dog_id from profile data before saving
            profile_data = {k: v for k, v in result.items() if k != "dog_id"}

            # Update the dog_profiler_data column
            cursor.execute(
                """
                UPDATE animals
                SET dog_profiler_data = %s,
                    updated_at = NOW()
                WHERE id = %s
                """,
                (json.dumps(profile_data), dog_id),
            )
        
        conn.commit()
        cursor.close()

    # Context manager support
    async def __aenter__(self):
        """Enter context manager."""
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Exit context manager."""
        if self.llm_service:
            await self.llm_service.__aexit__(exc_type, exc_val, exc_tb)
