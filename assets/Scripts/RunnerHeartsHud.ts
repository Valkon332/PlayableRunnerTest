import { _decorator, Component, Node, UIOpacity } from 'cc';
import { RunnerHealth } from './RunnerHealth';

const { ccclass, property } = _decorator;

@ccclass('RunnerHeartsHud')
export class RunnerHeartsHud extends Component {
  @property({ type: RunnerHealth })
  public health: RunnerHealth | null = null;

  @property({ type: Node })
  public heartsRoot: Node | null = null;

  @property({ type: [Node] })
  public heartSlots: Node[] = [];

  @property
  public fullHeartOpacity = 255;

  @property
  public lostHeartOpacity = 70;

  private _ops: UIOpacity[] = [];

  onLoad() {
    const root = this.heartsRoot ?? this.node;
    const raw =
      this.heartSlots.length > 0 ? this.heartSlots : root.children.slice();
    const slots = raw.filter((n): n is Node => !!n?.isValid);
    this._ops = slots.map((n) => {
      let op = n.getComponent(UIOpacity);
      if (!op) {
        op = n.addComponent(UIOpacity);
      }
      return op;
    });
  }

  start() {
    if (!this.health) {
      this.health = this._findHealth();
    }
    this._sync();
  }

  update() {
    this._sync();
  }

  private _findHealth(): RunnerHealth | null {
    const scene = this.node.scene;
    if (!scene) {
      return null;
    }
    const list = scene.getComponentsInChildren(RunnerHealth);
    return list.length > 0 ? list[0] : null;
  }

  private _sync() {
    if (!this.health) {
      return;
    }
    const hp = this.health.hp;
    const max = this.health.maxHp;
    const fullOp = Math.min(255, Math.max(0, this.fullHeartOpacity));
    const lostOp = Math.min(255, Math.max(0, this.lostHeartOpacity));
    const n = Math.min(this._ops.length, max);
    for (let i = 0; i < n; i++) {
      const op = this._ops[i];
      op.opacity = hp > i ? fullOp : lostOp;
    }
  }
}
