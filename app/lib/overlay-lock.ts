/**
 * Кой голям прозорец е на екрана в момента.
 *
 * Колелото на късмета и кръстосаната оферта се палят от едно и също нещо -
 * добавяне в количката - и без уговорка излизат едно върху друго. Който дойде
 * пръв, взима екрана; другият този път не се показва и чака следващото
 * добавяне.
 */
let holder: string | null = null;

export function claimOverlay(name: string): boolean {
  if (holder && holder !== name) return false;
  holder = name;
  return true;
}

export function releaseOverlay(name: string): void {
  if (holder === name) holder = null;
}
