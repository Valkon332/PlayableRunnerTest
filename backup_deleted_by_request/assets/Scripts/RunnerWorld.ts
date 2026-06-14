import { _decorator, Component, Node, Vec3 } from 'cc';

const { ccclass, executionOrder, property } = _decorator;

@ccclass('RunnerWorld')
@executionOrder(9999)
export class RunnerWorld extends Component {
  @property
  public speed = 700;

  @property({ type: Node })
  public scrollRoot: Node | null = null;

  private readonly _pos = new Vec3();

  onLoad() {
    const ws = this.node.getChildByName('WorldScroll');
    if (ws?.isValid) {
      this.scrollRoot = ws;
    }
    const root = this.scrollRoot;
    if (!root?.isValid) {
      return;
    }
    let pl = root.getChildByName('Player');
    if (!pl) {
      pl = this.node.getChildByName('Player');
      if (pl?.isValid) {
        pl.setParent(root, true);
      }
    }
  }

  lateUpdate(dt: number) {
    const root = this.scrollRoot;
    if (!root?.isValid) {
      return;
    }
    const dx = -this.speed * dt;
    const kids = root.children;
    for (let i = 0; i < kids.length; i++) {
      const ch = kids[i];
      if (!ch?.isValid) {
        continue;
      }
      ch.getPosition(this._pos);
      this._pos.x += dx;
      ch.setPosition(this._pos);
    }
  }
}
