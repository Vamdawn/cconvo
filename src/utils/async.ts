/**
 * 异步工具函数
 */

/**
 * 带并发限制的并行执行
 * @param items 待处理项目
 * @param limit 最大并发数
 * @param fn 处理函数
 * @returns 按原顺序返回的结果数组
 */
export async function parallelLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = [];
  let index = 0;

  async function worker(): Promise<void> {
    while (index < items.length) {
      const i = index++;
      results[i] = await fn(items[i]);
    }
  }

  const workerCount = Math.min(limit, items.length);
  await Promise.all(Array(workerCount).fill(0).map(() => worker()));
  return results;
}
