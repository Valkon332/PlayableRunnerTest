import { _decorator, Component, Node, Vec3 } from 'cc';

const { ccclass, executionOrder, property } = _decorator;

@ccclass('RunnerWorld')
@executionOrder(9999)
export class RunnerWorld extends Component {
  @property
  public speed = 700;

  @property({ type: Node })
  public scrollRoot: Node | null = null;

  @property
  public skipNodeNames: string[] = ['Player'];

  private readonly _pos = new Vec3();

  private _scrolling = false;

  public setScrolling(value: boolean) {
    this._scrolling = value;
  }

  public get scrolling(): boolean {
    return this._scrolling;
  }

  onLoad() {
    if (!this.scrollRoot) {
      const ws = this.node.getChildByName('WorldScroll');
      if (ws?.isValid) {
        this.scrollRoot = ws;
      }
    }
    this._syncEnemySkipNames();
  }

  lateUpdate(dt: number) {
    if (!this._scrolling) {
      return;
    }
    const root = this.scrollRoot;
    if (!root?.isValid) {
      return;
    }
    const dx = -this.speed * dt;
    const kids = root.children;
    for (let i = 0; i < kids.length; i++) {
      const ch = kids[i];
      if (!ch?.isValid || this._isScrollSkipped(ch.name)) {
        continue;
      }
      ch.getPosition(this._pos);
      this._pos.x += dx;
      ch.setPosition(this._pos);
    }
  }

  public registerScrollSkipNode(name: string) {
    if (!name || this.skipNodeNames.includes(name)) {
      return;
    }
    this.skipNodeNames.push(name);
  }

  private _isScrollSkipped(name: string): boolean {
    if (this.skipNodeNames.includes(name)) {
      return true;
    }
    const key = name.toLowerCase().replace(/\s+/g, '');
    return key === 'player' || key.startsWith('enemy');
  }

  private _syncEnemySkipNames() {
    const root = this.scrollRoot;
    if (!root?.isValid) {
      return;
    }
    const kids = root.children;
    for (let i = 0; i < kids.length; i++) {
      const n = kids[i];
      if (!n?.isValid) {
        continue;
      }
      const key = n.name.toLowerCase().replace(/\s+/g, '');
      if (key.startsWith('enemy')) {
        this.registerScrollSkipNode(n.name);
      }
    }
  }
}
