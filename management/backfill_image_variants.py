"""Create the WebP variants for images already on R2 (#761).

New uploads get their variants when they are stored (R2Service.upload_variants).
This covers everything uploaded before that: every R2 URL referenced by a dog
(hero and gallery) or a rescue logo. Live dogs go first. An image whose widest
variant already exists is skipped, so the command can be re-run safely.

It only reads the database and writes R2 objects, so a read-only connection is
enough:

    uv run python management/backfill_image_variants.py --database-url "$PROD_RO_DATABASE_URL"
    uv run python management/backfill_image_variants.py --database-url ... --dry-run
"""

import argparse
import logging
import os
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed

import psycopg2
from botocore.exceptions import ClientError
from dotenv import load_dotenv

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from utils.image_variants import VARIANT_WIDTHS, variant_key  # noqa: E402
from utils.r2_service import R2Service  # noqa: E402

logger = logging.getLogger("backfill_image_variants")

# Live dogs first, then retired dogs, then logos. DISTINCT ON keeps each URL's
# best priority.
_URLS_SQL = """
WITH urls AS (
    SELECT primary_image_url AS url, CASE WHEN active THEN 0 ELSE 2 END AS priority FROM animals
    UNION ALL
    SELECT image ->> 'url', CASE WHEN active THEN 1 ELSE 3 END
    FROM animals, jsonb_array_elements(CASE WHEN jsonb_typeof(images) = 'array' THEN images ELSE '[]' END) AS image
    UNION ALL
    SELECT logo_url, 4 FROM organizations
)
SELECT url FROM (
    SELECT DISTINCT ON (url) url, priority FROM urls WHERE url LIKE %s ORDER BY url, priority
) ranked
ORDER BY priority, url
"""


def referenced_keys(database_url: str, domain: str) -> list[str]:
    prefix = f"https://{domain}/"
    with psycopg2.connect(database_url) as conn, conn.cursor() as cursor:
        cursor.execute(_URLS_SQL, (f"{prefix}%",))
        urls = [row[0] for row in cursor.fetchall()]
    # Stored URLs are built straight from keys, so the rest of the URL is the key
    return [url[len(prefix) :] for url in urls if "/cdn-cgi/" not in url]


def backfill_one(s3, bucket: str, key: str) -> str:
    try:
        s3.head_object(Bucket=bucket, Key=variant_key(key, VARIANT_WIDTHS[-1]))
        return "skipped"
    except ClientError as e:
        if e.response["Error"]["Code"] not in ("404", "NoSuchKey"):
            raise
    try:
        body = s3.get_object(Bucket=bucket, Key=key)["Body"].read()
    except ClientError as e:
        if e.response["Error"]["Code"] in ("404", "NoSuchKey"):
            return "missing"
        raise
    # upload_variants logs why; an undecodable original fails the same way on every run
    return "created" if R2Service.upload_variants(s3, bucket, key, body) else "unusable"


def main() -> int:
    load_dotenv()
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--database-url", default=os.getenv("PROD_RO_DATABASE_URL"), help="Postgres URL to read image URLs from")
    parser.add_argument("--workers", type=int, default=8)
    parser.add_argument("--limit", type=int, help="Only the first N images (for a trial run)")
    parser.add_argument("--dry-run", action="store_true", help="Count the images, write nothing")
    args = parser.parse_args()
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

    if not args.database_url:
        parser.error("--database-url (or PROD_RO_DATABASE_URL) is required")
    if not R2Service.prepare_for_parallel_uploads():
        logger.error("R2 is not configured (R2_* variables)")
        return 1

    domain = os.environ["R2_CUSTOM_DOMAIN"].removeprefix("https://").removeprefix("http://").rstrip("/")
    keys = referenced_keys(args.database_url, domain)[: args.limit]
    logger.info(f"{len(keys)} referenced images on {domain}")
    if args.dry_run:
        return 0

    s3 = R2Service._get_s3_client()
    bucket = os.environ["R2_BUCKET_NAME"]
    counts: dict[str, int] = {}
    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        futures = {pool.submit(backfill_one, s3, bucket, key): key for key in keys}
        for done, future in enumerate(as_completed(futures), 1):
            try:
                outcome = future.result()
            except Exception as e:
                logger.warning(f"{futures[future]}: {e}")
                outcome = "failed"
            counts[outcome] = counts.get(outcome, 0) + 1
            if done % 500 == 0:
                logger.info(f"{done}/{len(keys)} {counts}")

    logger.info(f"Done: {counts}")
    return 1 if counts.get("failed") else 0  # "unusable" originals don't fail the run


if __name__ == "__main__":
    sys.exit(main())
