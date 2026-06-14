import { _decorator, Component, Node, UITransform, Vec3, instantiate } from 'cc';

const { ccclass, property } = _decorator;

@ccclass('InfiniteHorizontalScroll')
export class InfiniteHorizontalScroll extends Component {
  @property
  public speed = 300;

  @property
  public parallax = 1;

  @property
  public segmentsCount = 2;

  private _segments: Node[] = [];
  private _segmentWidth = 0;
  private readonly _tmp = new Vec3();

  onLoad() {
    const template = this.node.children[0];
    if (!template) return;

    const w = this._readWidth(template);
    if (w <= 0) return;
    this._segmentWidth = w;

    this._segments = [template];
    for (let i = 1; i < Math.max(1, this.segmentsCount); i++) {
      const clone = instantiate(template);
      clone.setParent(this.node);
      clone.getPosition(this._tmp);
      this._tmp.x += this._segmentWidth * i;
      clone.setPosition(this._tmp);
      this._segments.push(clone);
    }
  }

  update(dt: number) {
    if (this._segments.length === 0 || this._segmentWidth <= 0) return;

    const dx = -this.speed * this.parallax * dt;

    let rightMostX = -Infinity;
    for (const s of this._segments) {
      if (!s || !s.isValid) continue;
      s.getPosition(this._tmp);
      rightMostX = Math.max(rightMostX, this._tmp.x);
    }

    for (const s of this._segments) {
      if (!s || !s.isValid) continue;
      s.getPosition(this._tmp);
      this._tmp.x += dx;

      if (this._tmp.x <= -this._segmentWidth) {
        this._tmp.x = rightMostX + this._segmentWidth;
        rightMostX = this._tmp.x;
      }

      s.setPosition(this._tmp);
    }
  }

  private _readWidth(n: Node): number {
    const ui = n.getComponent(UITransform);
    if (ui) return ui.contentSize.width;
    return 0;
  }
}
