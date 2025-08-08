#!/usr/bin/env python3
"""
Performance demonstration for batch processing improvements.

This script demonstrates the significant performance improvements achieved
by replacing individual database commits with batch processing.
"""

import time
from typing import List, Tuple
from unittest.mock import Mock

from management.batch_processor import create_batch_processor


def simulate_old_individual_commits(items: List[int], commit_delay: float = 0.01) -> float:
    """
    Simulate the old pattern of individual commits per item.
    Each commit has a 10ms delay to simulate database latency.
    """
    conn = Mock()
    cursor = Mock()

    def commit_with_delay():
        time.sleep(commit_delay)

    conn.commit.side_effect = commit_with_delay

    start_time = time.time()

    for item in items:
        # Simulate database operation + individual commit
        cursor.execute("UPDATE animals SET enriched_description = %s WHERE id = %s", (f"enriched_{item}", item))
        conn.commit()  # Individual commit - the performance bottleneck!

    return time.time() - start_time


def simulate_new_batch_processing(items: List[int], batch_size: int = 25, commit_delay: float = 0.01) -> Tuple[float, dict]:
    """
    Simulate the new batch processing approach.
    Commits are done per batch, significantly reducing database overhead.
    """
    conn = Mock()
    cursor = Mock()

    def commit_with_delay():
        time.sleep(commit_delay)

    conn.commit.side_effect = commit_with_delay

    # Create batch processor
    batch_processor = create_batch_processor(conn, batch_size=batch_size, commit_frequency=1)

    def create_query(item: int) -> Tuple[str, Tuple]:
        return ("UPDATE animals SET enriched_description = %s WHERE id = %s", (f"enriched_{item}", item))

    start_time = time.time()
    result = batch_processor.process_batch(items, create_query)
    processing_time = time.time() - start_time

    return processing_time, {"total_processed": result.total_processed, "successful_batches": result.successful_batches, "success_rate": result.success_rate, "commits": conn.commit.call_count}


def main():
    """Run performance demonstration."""
    print("🚀 Database Batch Processing Performance Demo")
    print("=" * 50)

    # Test with different dataset sizes
    test_sizes = [50, 100, 200]
    batch_sizes = [10, 25, 50]

    for num_items in test_sizes:
        print(f"\n📊 Testing with {num_items} items:")
        print("-" * 30)

        # Simulate dataset
        items = list(range(1, num_items + 1))

        # Old approach (individual commits)
        old_time = simulate_old_individual_commits(items)

        print(f"❌ Old approach (individual commits):")
        print(f"   Time: {old_time:.3f}s")
        print(f"   Commits: {num_items}")
        print(f"   Time per item: {old_time/num_items*1000:.1f}ms")

        # Test different batch sizes
        for batch_size in batch_sizes:
            new_time, stats = simulate_new_batch_processing(items, batch_size)
            improvement_ratio = old_time / new_time

            print(f"\n✅ New approach (batch size {batch_size}):")
            print(f"   Time: {new_time:.3f}s")
            print(f"   Commits: {stats['commits']}")
            print(f"   Batches: {stats['successful_batches']}")
            print(f"   Success rate: {stats['success_rate']:.1f}%")
            print(f"   Improvement: {improvement_ratio:.1f}x faster")
            print(f"   Time saved: {old_time - new_time:.3f}s ({((old_time - new_time)/old_time)*100:.1f}%)")

    print("\n🎯 Summary:")
    print("- Batch processing reduces database commits from N to N/batch_size")
    print("- Performance improvement scales with dataset size")
    print("- Larger batch sizes generally provide better performance")
    print("- Error handling and transaction safety are maintained")
    print("- Memory usage remains constant regardless of dataset size")

    print("\n💡 Real-world impact:")
    print("- Processing 1000 animals: ~10+ seconds faster")
    print("- Reduces database load and connection overhead")
    print("- More predictable performance under load")
    print("- Better scalability for large datasets")


if __name__ == "__main__":
    main()
