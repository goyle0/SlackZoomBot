/**
 * 非同期処理ユーティリティ
 */

/**
 * 並列度制限付きPromise.all
 * 指定した並列数を超えないようにPromiseを実行する
 * 結果は入力配列と同じ順序で返される
 *
 * @param items 処理対象の配列
 * @param fn 各アイテムに対する非同期処理
 * @param concurrency 最大並列数（デフォルト: 5）
 * @returns PromiseSettledResult配列（入力と同じ順序、成功/失敗を個別に確認可能）
 *
 * @example
 * const results = await promiseAllWithConcurrency(
 *   meetingIds,
 *   (id) => fetchMeetingDetails(id),
 *   5
 * );
 */
export async function promiseAllWithConcurrency<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  concurrency: number = 5
): Promise<PromiseSettledResult<R>[]> {
  // 結果を入力順序で格納するため、事前に配列を確保
  const results: PromiseSettledResult<R>[] = new Array(items.length);
  const executing: Promise<void>[] = [];

  for (let i = 0; i < items.length; i++) {
    const index = i;
    const promise = fn(items[i])
      .then((value) => {
        results[index] = { status: 'fulfilled', value };
      })
      .catch((reason) => {
        results[index] = { status: 'rejected', reason };
      })
      .finally(() => {
        executing.splice(executing.indexOf(promise), 1);
      });

    executing.push(promise);

    if (executing.length >= concurrency) {
      await Promise.race(executing);
    }
  }

  await Promise.all(executing);
  return results;
}
