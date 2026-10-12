// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

const SVG_NS = 'http://www.w3.org/2000/svg'

export class SVGElementPool {
  private pool: Map<string, SVGElement[]> = new Map()
  private createdCount: number = 0
  private reusedCount: number = 0

  acquire(tag: string): SVGElement {
    const bucket = this.pool.get(tag)
    if (bucket && bucket.length > 0) {
      this.reusedCount++
      return bucket.pop()!
    }
    this.createdCount++
    return document.createElementNS(SVG_NS, tag)
  }

  release(el: SVGElement): void {
    try {
      while (el.attributes.length > 0) {
        el.removeAttribute(el.attributes[0].name)
      }
      el.textContent = ''
    } catch {
      /* empty */
    }

    const tag = el.tagName
    let bucket = this.pool.get(tag)
    if (!bucket) {
      bucket = []
      this.pool.set(tag, bucket)
    }
    if (bucket.length < 200) {
      bucket.push(el)
    }
  }

  clear(): void {
    this.pool.clear()
    this.createdCount = 0
    this.reusedCount = 0
  }

  getStats(): { poolSize: number; createdCount: number; reusedCount: number } {
    let poolSize = 0
    this.pool.forEach((bucket) => {
      poolSize += bucket.length
    })
    return {
      poolSize,
      createdCount: this.createdCount,
      reusedCount: this.reusedCount,
    }
  }
}