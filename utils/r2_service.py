"""
R2Service - Cloudflare R2 storage service with S3-compatible API
Replacement for CloudinaryService with interface parity
"""

import hashlib
import logging
import os
import threading
import time
from collections.abc import Callable
from concurrent.futures import ThreadPoolExecutor, as_completed
from io import BytesIO

import boto3
import requests
from botocore.exceptions import ClientError

logger = logging.getLogger(__name__)


class R2ConfigurationError(Exception):
    """Raised when R2 is not properly configured."""

    pass


class R2Service:
    """R2 storage service with CloudinaryService interface parity"""

    _config_checked = False
    _config_valid = False
    _s3_client = None

    # Global rate limiting for all R2 uploads with exponential backoff
    _last_upload_time = 0
    _upload_lock = threading.Lock()
    _state_lock = threading.Lock()  # Lock for protecting shared state access
    RATE_LIMIT_SECONDS = 1.0
    _consecutive_failures = 0  # Track consecutive rate limit failures

    # Circuit breaker and failure tracking
    _failure_history = []  # List of (timestamp, error_type) tuples
    _success_history = []  # List of timestamps
    _circuit_breaker_open = False
    _circuit_breaker_until = 0
    _circuit_breaker_threshold = 5  # Open after 5 consecutive failures
    _circuit_breaker_timeout = 60  # Seconds to wait before testing again

    @classmethod
    def _reset_config_cache(cls):
        """Reset configuration cache for testing purposes."""
        cls._config_checked = False
        cls._config_valid = False
        cls._s3_client = None

    @classmethod
    def _enforce_rate_limit(cls):
        """Enforce rate limit with exponential backoff and jitter."""
        import random

        with cls._upload_lock:
            current_time = time.time()
            time_since_last = current_time - cls._last_upload_time

            # Calculate delay with exponential backoff based on consecutive failures
            base_delay = cls.RATE_LIMIT_SECONDS
            with cls._state_lock:
                consecutive_failures = cls._consecutive_failures

            if consecutive_failures > 0:
                # Exponential backoff: 1s, 2s, 4s, 8s, 16s (max)
                backoff_delay = min(base_delay * (2**consecutive_failures), 16.0)
                # Add jitter to prevent synchronized retries
                jitter = random.uniform(0, 0.5)
                required_delay = backoff_delay + jitter
            else:
                required_delay = base_delay

            if time_since_last < required_delay:
                sleep_time = required_delay - time_since_last
                logger.debug(f"Rate limiting: sleeping {sleep_time:.2f}s before upload (failures: {consecutive_failures})")
                time.sleep(sleep_time)
            cls._last_upload_time = time.time()

    @classmethod
    def _check_configuration(cls):
        """Check R2 configuration once and cache result."""
        if cls._config_checked:
            return cls._config_valid

        cls._config_checked = True

        required_vars = [
            "R2_ACCOUNT_ID",
            "R2_ACCESS_KEY_ID",
            "R2_SECRET_ACCESS_KEY",
            "R2_BUCKET_NAME",
            "R2_ENDPOINT",
        ]
        missing_vars = [var for var in required_vars if not os.getenv(var)]

        if missing_vars:
            logger.info(f"R2 not configured (missing: {', '.join(missing_vars)}). Using original image URLs.")
            cls._config_valid = False
            return False

        cls._config_valid = True
        logger.info("R2 successfully configured")
        return True

    @classmethod
    def _get_s3_client(cls):
        """Get or create S3 client for R2"""
        if cls._s3_client is None:
            from botocore.config import Config

            # Configure timeouts and retries for better resilience
            config = Config(
                connect_timeout=10,  # 10 seconds to establish connection
                read_timeout=30,  # 30 seconds to read response
                max_pool_connections=5,  # Limit concurrent connections
                retries={
                    "max_attempts": 3,
                    "mode": "adaptive",
                },  # Retry up to 3 times  # Use adaptive retry mode for better handling
            )

            cls._s3_client = boto3.client(
                "s3",
                endpoint_url=os.getenv("R2_ENDPOINT"),
                aws_access_key_id=os.getenv("R2_ACCESS_KEY_ID"),
                aws_secret_access_key=os.getenv("R2_SECRET_ACCESS_KEY"),
                region_name="auto",  # R2 uses 'auto' region
                config=config,
            )
        return cls._s3_client

    @classmethod
    def is_configured(cls):
        """Check if R2 is properly configured."""
        return cls._check_configuration()

    @staticmethod
    def _generate_image_key(image_url: str, animal_name: str, organization_name: str = "unknown") -> str:
        """
        Generate unique image key for R2 storage using SHA-256.

        SECURITY UPGRADE: Replaced MD5 with SHA-256 to address cryptographic vulnerability.
        MD5 is susceptible to collision attacks which could lead to cache poisoning or
        unauthorized access to image resources.
        """
        # Use SHA-256 for cryptographic security (upgraded from MD5)
        url_hash = hashlib.sha256(image_url.encode()).hexdigest()[:8]
        safe_animal_name = animal_name.lower().replace(" ", "_").replace("-", "_")
        safe_org_name = organization_name.lower().replace(" ", "_").replace("-", "_")

        return f"rescue_dogs/{safe_org_name}/{safe_animal_name}_{url_hash}.jpg"

    @staticmethod
    def _generate_legacy_image_key(image_url: str, animal_name: str, organization_name: str = "unknown") -> str:
        """
        Generate legacy MD5-based image key for backward compatibility.

        This method is used to check for existing images that were uploaded
        with the old MD5-based key format before the security upgrade.
        """
        # Legacy MD5 format for backward compatibility only
        url_hash = hashlib.md5(image_url.encode()).hexdigest()[:8]
        safe_animal_name = animal_name.lower().replace(" ", "_").replace("-", "_")
        safe_org_name = organization_name.lower().replace(" ", "_").replace("-", "_")

        return f"rescue_dogs/{safe_org_name}/{safe_animal_name}_{url_hash}.jpg"

    @staticmethod
    def _build_custom_domain_url(key: str) -> str:
        """Build URL using custom domain"""
        custom_domain = os.getenv("R2_CUSTOM_DOMAIN", "").rstrip("/")
        if custom_domain:
            # Ensure custom domain has https:// protocol
            if not custom_domain.startswith(("http://", "https://")):
                custom_domain = f"https://{custom_domain}"
            return f"{custom_domain}/{key}"

        # Fallback to R2 endpoint if no custom domain
        endpoint = os.getenv("R2_ENDPOINT", "").rstrip("/")
        bucket_name = os.getenv("R2_BUCKET_NAME", "")
        return f"{endpoint}/{bucket_name}/{key}"

    @staticmethod
    def _is_r2_url(url: str) -> bool:
        """Check if URL is from R2 custom domain"""
        if not url:
            return False

        custom_domain = os.getenv("R2_CUSTOM_DOMAIN", "")
        if custom_domain and custom_domain in url:
            return True

        return False

    @staticmethod
    def upload_image_from_url(
        image_url: str,
        animal_name: str,
        organization_name: str = "unknown",
        raise_on_missing_config: bool = False,
    ) -> tuple[str | None, bool]:
        """
        Upload image to R2 from URL and return the URL.

        Args:
            image_url: Original image URL
            animal_name: Name of the animal for folder organization
            organization_name: Organization name for folder organization
            raise_on_missing_config: If True, raise exception when R2 not configured

        Returns:
            tuple: (r2_url_or_original_url, success_boolean)

        Raises:
            R2ConfigurationError: If raise_on_missing_config=True and R2 not configured
        """
        if not image_url:
            logger.warning("No image URL provided")
            return None, False

        # Check configuration
        if not R2Service._check_configuration():
            if raise_on_missing_config:
                raise R2ConfigurationError("R2 not properly configured. Missing environment variables.")

            # Fallback: return original URL with success=False
            logger.debug(f"R2 not configured, using original URL: {image_url}")
            return image_url, False

        try:
            # Generate new SHA-256 image key
            image_key = R2Service._generate_image_key(image_url, animal_name, organization_name)
            bucket_name = os.getenv("R2_BUCKET_NAME")

            # Get S3 client
            s3_client = R2Service._get_s3_client()

            # Check if image already exists (new SHA-256 key first)
            try:
                s3_client.head_object(Bucket=bucket_name, Key=image_key)
                logger.debug(f"Image already exists in R2 (SHA-256): {image_key}")
                return R2Service._build_custom_domain_url(image_key), True
            except ClientError as e:
                if e.response["Error"]["Code"] != "404":
                    logger.warning(f"Could not check existing image (SHA-256): {e}")

            # PERFORMANCE FIX: Commented out legacy MD5 check to reduce R2 API calls by 50%
            # Legacy compatibility disabled for performance - only check SHA-256 keys
            # try:
            #     s3_client.head_object(Bucket=bucket_name, Key=legacy_key)
            #     logger.debug(f"Image exists as legacy key (MD5): {legacy_key}")
            #     return R2Service._build_custom_domain_url(legacy_key), True
            # except ClientError as e:
            #     if e.response["Error"]["Code"] != "404":
            #         logger.warning(f"Could not check existing legacy image (MD5): {e}")
            # SHA-256 key doesn't exist, proceed with upload
            pass

            # Download the image with shorter timeout to prevent hanging
            headers = {"User-Agent": "Mozilla/5.0 (compatible; RescueDogAggregator/1.0)"}
            response = requests.get(image_url, timeout=(10, 20), headers=headers)  # (connect, read) timeouts
            response.raise_for_status()

            if response.status_code != 200:
                logger.warning(f"Failed to download image {image_url}: HTTP {response.status_code}")
                return image_url, False

            # Check content type
            content_type = response.headers.get("content-type", "").lower()
            if not any(img_type in content_type for img_type in ["image/jpeg", "image/jpg", "image/png", "image/webp"]):
                logger.warning(f"Invalid content type for image {image_url}: {content_type}")
                return image_url, False

            # Enforce global rate limiting before upload
            R2Service._enforce_rate_limit()

            # Upload to R2 - sanitize metadata to ASCII only
            import unicodedata

            # Remove accents and non-ASCII characters from metadata
            safe_animal_name = unicodedata.normalize("NFKD", animal_name).encode("ascii", "ignore").decode("ascii")
            safe_org_name = unicodedata.normalize("NFKD", organization_name).encode("ascii", "ignore").decode("ascii")

            image_data = BytesIO(response.content)
            s3_client.upload_fileobj(
                image_data,
                bucket_name,
                image_key,
                ExtraArgs={
                    "ContentType": content_type,
                    "CacheControl": "public, max-age=86400, s-maxage=604800",
                    "Metadata": {
                        "original_url": image_url,
                        "animal_name": safe_animal_name,
                        "organization": safe_org_name,
                    },
                },
            )

            logger.info(f"Successfully uploaded image to R2: {image_key}")
            # Reset consecutive failures on success
            with R2Service._state_lock:
                R2Service._consecutive_failures = 0
            return R2Service._build_custom_domain_url(image_key), True

        except requests.exceptions.RequestException as e:
            logger.warning(f"Network error downloading image {image_url}: {e}")
            return image_url, False

        except ClientError as e:
            error_code = e.response.get("Error", {}).get("Code", "")
            if error_code in ["SlowDown", "TooManyRequests", "RequestLimitExceeded"]:
                # Increment failure counter for rate limiting errors
                with R2Service._state_lock:
                    R2Service._consecutive_failures = min(R2Service._consecutive_failures + 1, 5)  # Cap at 5
                    failures = R2Service._consecutive_failures
                logger.warning(f"R2 rate limit error uploading image {image_url}: {error_code} (failures: {failures})")
            else:
                logger.warning(f"R2 error uploading image {image_url}: {e}")
            return image_url, False

        except Exception as e:
            logger.warning(f"Unexpected error uploading image {image_url}: {e}")
            return image_url, False

    @staticmethod
    def get_optimized_url(r2_url: str, transformation_options: dict | None = None) -> str:
        """
        Get optimized URL using Cloudflare Images transformations.

        Args:
            r2_url: R2 image URL
            transformation_options: Dict with width, height, fit, etc.

        Returns:
            str: Optimized URL or original URL if not R2 URL
        """
        if not r2_url or not R2Service._is_r2_url(r2_url):
            return r2_url

        if not R2Service.is_configured():
            logger.debug("R2 not configured, returning original URL")
            return r2_url

        try:
            # For R2 URLs, use Cloudflare Images transformation format
            custom_domain = os.getenv("R2_CUSTOM_DOMAIN", "").rstrip("/")
            if not custom_domain:
                return r2_url

            # Extract image path from URL
            if custom_domain in r2_url:
                image_path = r2_url.replace(custom_domain + "/", "")
            else:
                return r2_url

            # Build transformation parameters
            if transformation_options:
                params = []
                if "width" in transformation_options:
                    params.append(f"w_{transformation_options['width']}")
                if "height" in transformation_options:
                    params.append(f"h_{transformation_options['height']}")
                if "fit" in transformation_options:
                    # Map fit options to Cloudflare Images format
                    fit_mapping = {
                        "fill": "c_fill",
                        "fit": "c_fit",
                        "crop": "c_crop",
                        "scale": "c_scale",
                        "cover": "c_cover",
                    }
                    cloudflare_fit = fit_mapping.get(transformation_options["fit"], "c_fill")
                    params.append(cloudflare_fit)
                if "quality" in transformation_options:
                    params.append(f"q_{transformation_options['quality']}")
                if "gravity" in transformation_options:
                    # Add gravity parameter for smart cropping
                    params.append(f"g_{transformation_options['gravity']}")

                # Add format optimization
                params.append("f_auto")

                transform_string = ",".join(params)
                return f"{custom_domain}/cdn-cgi/image/{transform_string}/{image_path}"

            return r2_url

        except Exception as e:
            logger.error(f"Error generating optimized URL for {r2_url}: {e}")
            return r2_url

    @staticmethod
    def get_status() -> dict:
        """Get R2 service status for health checks."""
        return {
            "configured": R2Service.is_configured(),
            "account_id": os.getenv("R2_ACCOUNT_ID", "Not set"),
            "access_key_set": bool(os.getenv("R2_ACCESS_KEY_ID")),
            "secret_key_set": bool(os.getenv("R2_SECRET_ACCESS_KEY")),
            "bucket_name": os.getenv("R2_BUCKET_NAME", "Not set"),
            "endpoint": os.getenv("R2_ENDPOINT", "Not set"),
            "custom_domain": os.getenv("R2_CUSTOM_DOMAIN", "Not set"),
        }

    @classmethod
    def batch_upload_images(
        cls,
        images: list,
        batch_size: int = 5,
        batch_delay: float = 3.0,
        adaptive_delay: bool = True,
        progress_callback: Callable | None = None,
    ) -> list:
        """Upload multiple images in batches with delays to avoid rate limiting.

        Args:
            images: List of tuples (image_url, animal_name, organization_name)
            batch_size: Number of images to upload before pausing
            batch_delay: Base delay in seconds between batches
            adaptive_delay: Whether to increase delay based on failure rate
            progress_callback: Optional callback(current, total, url, success)

        Returns:
            List of tuples (uploaded_url, success_bool)
        """
        if not images:
            return []

        results = []
        total_images = len(images)
        failures_in_batch = 0

        # Log batch upload start
        logger.info(f"📦 Starting BATCH upload of {total_images} images (batch size: {batch_size})")

        for i, (image_url, animal_name, org_name) in enumerate(images):
            # Upload single image as part of batch
            uploaded_url, success = cls.upload_image_from_url(image_url, animal_name, org_name)
            results.append((uploaded_url, success))

            # Track failures for adaptive delays
            if not success:
                failures_in_batch += 1

            # Call progress callback if provided
            if progress_callback:
                progress_callback(i + 1, total_images, uploaded_url, success)

            # Apply batch delay after completing a batch (but not after last image)
            if (i + 1) % batch_size == 0 and (i + 1) < total_images:
                delay = batch_delay

                # Adaptive delay based on failure rate in batch
                if adaptive_delay and failures_in_batch > 0:
                    failure_rate = failures_in_batch / batch_size
                    # Increase delay based on failure rate (up to 3x base delay)
                    delay = batch_delay * (1 + min(failure_rate * 2, 2))
                    logger.info(f"Batch completed with {failures_in_batch}/{batch_size} failures, using {delay:.1f}s delay")

                logger.info(f"Batch of {batch_size} uploads completed, pausing {delay:.1f}s before next batch")
                time.sleep(delay)
                failures_in_batch = 0  # Reset for next batch

        return results

    @classmethod
    def batch_upload_images_with_stats(
        cls,
        images: list,
        batch_size: int = 5,
        batch_delay: float = 3.0,
        adaptive_delay: bool = True,
    ) -> tuple[list, dict]:
        """Upload multiple images and return statistics.

        Args:
            images: List of tuples (image_url, animal_name, organization_name)
            batch_size: Number of images to upload before pausing
            batch_delay: Base delay in seconds between batches
            adaptive_delay: Whether to increase delay based on failure rate

        Returns:
            Tuple of (results_list, statistics_dict)
        """
        start_time = time.time()

        results = cls.batch_upload_images(
            images,
            batch_size=batch_size,
            batch_delay=batch_delay,
            adaptive_delay=adaptive_delay,
        )

        total_time = time.time() - start_time
        successful = sum(1 for _, success in results if success)
        failed = len(results) - successful

        stats = {
            "total": len(results),
            "successful": successful,
            "failed": failed,
            "success_rate": (successful / len(results) * 100) if results else 0,
            "total_time": total_time,
            "average_time": total_time / len(results) if results else 0,
        }

        logger.info(f"Batch upload completed: {successful}/{len(results)} successful ({stats['success_rate']:.1f}%), took {total_time:.1f}s total, {stats['average_time']:.2f}s per image")

        return results, stats

    @classmethod
    def concurrent_upload_images(
        cls,
        images: list[tuple[str, str, str]],
        max_workers: int = 3,
        throttle_ms: int = 200,
        max_concurrent_uploads: int | None = None,
        adaptive_throttle: bool = False,
        progress_callback: Callable | None = None,
    ) -> list[tuple[str, bool]]:
        """Upload multiple images concurrently with throttling.

        Args:
            images: List of tuples (image_url, animal_name, organization_name)
            max_workers: Maximum number of concurrent upload threads
            throttle_ms: Milliseconds to wait between starting uploads
            max_concurrent_uploads: Optional max simultaneous uploads (uses semaphore)
            adaptive_throttle: Whether to increase throttle on failures
            progress_callback: Optional callback(completed, total, url, success)

        Returns:
            List of tuples (uploaded_url, success_bool) in original order
        """
        if not images:
            return []

        results = [None] * len(images)  # Pre-allocate to maintain order
        completed_count = 0
        throttle_delay = throttle_ms / 1000.0
        current_throttle = throttle_delay
        semaphore = None

        if max_concurrent_uploads:
            semaphore = threading.Semaphore(max_concurrent_uploads)

        def upload_with_index(index: int, image_data: tuple[str, str, str]) -> tuple[int, str, bool]:
            """Upload single image and return index with result."""
            nonlocal current_throttle
            image_url, animal_name, org_name = image_data

            try:
                if semaphore:
                    semaphore.acquire()

                # Apply throttle delay before starting upload
                if index > 0 and current_throttle > 0:
                    time.sleep(current_throttle)

                uploaded_url, success = cls.upload_image_from_url(image_url, animal_name, org_name)
                return index, uploaded_url, success
            except Exception as e:
                logger.error(f"Exception in concurrent upload for {image_url}: {e}")
                return index, image_url, False
            finally:
                if semaphore:
                    semaphore.release()

        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            # Submit all tasks
            futures = {executor.submit(upload_with_index, i, img_data): i for i, img_data in enumerate(images)}

            # Process completed uploads
            for future in as_completed(futures):
                try:
                    index, uploaded_url, success = future.result()
                    results[index] = (uploaded_url, success)
                    completed_count += 1

                    # Adaptive throttling
                    if adaptive_throttle:
                        if not success:
                            # Increase throttle on failure
                            current_throttle = min(current_throttle * 1.5, 2.0)
                        elif current_throttle > throttle_delay:
                            # Slowly decrease throttle on success
                            current_throttle = max(current_throttle * 0.9, throttle_delay)

                    # Progress callback
                    if progress_callback:
                        progress_callback(completed_count, len(images), uploaded_url, success)

                except Exception as e:
                    index = futures[future]
                    logger.error(f"Error processing future for index {index}: {e}")
                    results[index] = (images[index][0], False)

        return results

    @classmethod
    def concurrent_upload_images_with_stats(
        cls,
        images: list[tuple[str, str, str]],
        max_workers: int = 3,
        throttle_ms: int = 200,
        adaptive_throttle: bool = False,
    ) -> tuple[list[tuple[str, bool]], dict]:
        """Upload images concurrently and return statistics.

        Args:
            images: List of tuples (image_url, animal_name, organization_name)
            max_workers: Maximum number of concurrent upload threads
            throttle_ms: Milliseconds to wait between starting uploads
            adaptive_throttle: Whether to increase throttle on failures

        Returns:
            Tuple of (results_list, statistics_dict)
        """
        start_time = time.time()

        results = cls.concurrent_upload_images(
            images,
            max_workers=max_workers,
            throttle_ms=throttle_ms,
            adaptive_throttle=adaptive_throttle,
        )

        total_time = time.time() - start_time
        successful = sum(1 for _, success in results if success)
        failed = len(results) - successful

        stats = {
            "total": len(results),
            "successful": successful,
            "failed": failed,
            "success_rate": (successful / len(results) * 100) if results else 0,
            "total_time": total_time,
            "average_time": total_time / len(results) if results else 0,
            "max_concurrent": max_workers,
        }

        logger.info(
            f"Concurrent upload completed: {successful}/{len(results)} successful "
            f"({stats['success_rate']:.1f}%), took {total_time:.1f}s total "
            f"({stats['average_time']:.2f}s avg), max {max_workers} concurrent"
        )

        return results, stats

    # Circuit Breaker and Intelligent Fallback Methods

    @classmethod
    def track_upload_success(cls):
        """Track a successful upload."""
        with cls._state_lock:
            cls._success_history.append(time.time())
            # Clean old entries (keep last 5 minutes)
            cutoff_time = time.time() - 300
            cls._success_history = [t for t in cls._success_history if t > cutoff_time]

            # Reset consecutive failures on success
            if cls._consecutive_failures > 0:
                cls._consecutive_failures = max(0, cls._consecutive_failures - 1)

    @classmethod
    def track_upload_failure(cls, error_type: str = "unknown"):
        """Track a failed upload."""
        with cls._state_lock:
            cls._failure_history.append((time.time(), error_type))
            # Clean old entries (keep last 5 minutes)
            cutoff_time = time.time() - 300
            cls._failure_history = [(t, e) for t, e in cls._failure_history if t > cutoff_time]

            # Check if circuit breaker should open
            recent_failures = len([f for f in cls._failure_history if f[0] > time.time() - 60])
            if recent_failures >= cls._circuit_breaker_threshold:
                cls._circuit_breaker_open = True
                cls._circuit_breaker_until = time.time() + cls._circuit_breaker_timeout
                logger.warning(f"Circuit breaker opened due to {recent_failures} failures in 60s")

    @classmethod
    def is_circuit_breaker_open(cls) -> bool:
        """Check if circuit breaker is currently open."""
        with cls._state_lock:
            if cls._circuit_breaker_open:
                if time.time() > cls._circuit_breaker_until:
                    # Timeout expired, close circuit breaker
                    cls._circuit_breaker_open = False
                    logger.info("Circuit breaker closed after timeout")
                    return False
                return True
            return False

    @classmethod
    def get_failure_rate(cls, window_minutes: int = 5) -> float:
        """Calculate failure rate over specified window."""
        with cls._state_lock:
            cutoff_time = time.time() - (window_minutes * 60)
            recent_failures = len([f for f in cls._failure_history if f[0] > cutoff_time])
            recent_successes = len([t for t in cls._success_history if t > cutoff_time])

            total_attempts = recent_failures + recent_successes
            if total_attempts == 0:
                return 0.0

            return (recent_failures / total_attempts) * 100

    @classmethod
    def get_adaptive_batch_size(cls, base_size: int = 5) -> int:
        """Calculate adaptive batch size based on failure rate."""
        failure_rate = cls.get_failure_rate()

        if failure_rate < 10:
            return base_size * 2  # Double batch size for low failure rate
        elif failure_rate < 30:
            return base_size  # Normal batch size
        elif failure_rate < 50:
            return max(2, base_size // 2)  # Half batch size
        else:
            return 1  # Single uploads only for high failure rate

    @classmethod
    def categorize_error(cls, error_code: str) -> str:
        """Categorize error type for better handling."""
        rate_limit_errors = ["SlowDown", "TooManyRequests", "RequestLimitExceeded"]
        network_errors = ["NetworkError", "Timeout", "ConnectionError"]
        validation_errors = ["InvalidImage", "InvalidFormat", "ValidationError"]

        if error_code in rate_limit_errors:
            return "rate_limit"
        elif error_code in network_errors:
            return "network"
        elif error_code in validation_errors:
            return "validation"
        else:
            return "other"

    @classmethod
    def calculate_retry_delay(cls, attempt: int, base_delay: float = 1.0) -> float:
        """Calculate retry delay with exponential backoff and jitter."""
        import random

        # Exponential backoff: 1s, 2s, 4s, 8s, 16s
        delay = min(base_delay * (2**attempt), 16.0)
        # Add jitter (±50%)
        jitter = delay * random.uniform(-0.5, 0.5)
        return max(0.1, delay + jitter)

    @classmethod
    def upload_image_with_circuit_breaker(cls, image_url: str, animal_name: str, organization_name: str = "unknown") -> tuple[str | None, bool]:
        """Upload image with circuit breaker protection."""
        # Check circuit breaker
        if cls.is_circuit_breaker_open():
            logger.warning("Circuit breaker open, skipping R2 upload")
            return image_url, False

        # Attempt upload
        uploaded_url, success = cls.upload_image_from_url(image_url, animal_name, organization_name)

        # Track result
        if success:
            cls.track_upload_success()
        else:
            cls.track_upload_failure("upload_failed")

        return uploaded_url, success

    @classmethod
    def upload_image_with_fallback(
        cls,
        image_url: str,
        animal_name: str,
        organization_name: str = "unknown",
        failure_threshold: float = 50.0,
    ) -> tuple[str | None, bool]:
        """Upload image with intelligent fallback based on failure rate."""
        # Check failure rate
        failure_rate = cls.get_failure_rate()

        if failure_rate > failure_threshold:
            logger.warning(f"Failure rate {failure_rate:.1f}% exceeds threshold, using fallback")
            return image_url, False

        # Use circuit breaker upload
        return cls.upload_image_with_circuit_breaker(image_url, animal_name, organization_name)

    @classmethod
    def get_health_status(cls) -> dict:
        """Get comprehensive health status for monitoring."""
        recent_errors = [(e, count) for e, count in cls._get_error_counts().items()][:5]

        with cls._state_lock:
            circuit_breaker_open = cls._circuit_breaker_open
            consecutive_failures = cls._consecutive_failures
            total_attempts = len(cls._failure_history) + len(cls._success_history)

        return {
            "failure_rate": cls.get_failure_rate(),
            "circuit_breaker_open": circuit_breaker_open,
            "consecutive_failures": consecutive_failures,
            "total_attempts": total_attempts,
            "recent_errors": recent_errors,
            "adaptive_batch_size": cls.get_adaptive_batch_size(),
            "configured": cls.is_configured(),
        }

    @classmethod
    def _get_error_counts(cls) -> dict[str, int]:
        """Get count of recent errors by type."""
        from collections import Counter

        with cls._state_lock:
            cutoff_time = time.time() - 300  # Last 5 minutes
            recent_errors = [e for t, e in cls._failure_history if t > cutoff_time]
        return dict(Counter(recent_errors))
