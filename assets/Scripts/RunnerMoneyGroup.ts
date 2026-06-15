import {
  _decorator,
  Component,
  Node,
  Sprite,
  UITransform,
  Vec3,
  director,
} from 'cc';
import { RunnerWorld } from './RunnerWorld';
import { RunnerDamageScanner } from './RunnerDamageScanner';
import { RunnerBalanceScore } from './RunnerBalanceScore';
import { RunnerMoneyPraise } from './RunnerMoneyPraise';
import { RunnerAudioManager } from './RunnerAudioManager';

const { ccclass, property } = _decorator;

type FlyState = {
  node: Node;
  flying: boolean;
  done: boolean;
  elapsed: number;
  w0: Vec3;
  w1: Vec3;
  s0: Vec3;
};

@ccclass('RunnerMoneyGroup')
export class RunnerMoneyGroup extends Component {
  @property({ type: Node })
  public balanceTarget: Node | null = null;

  @property({ type: Node })
  public playerNode: Node | null = null;

  @property({ type: UITransform })
  public playerHitArea: UITransform | null = null;

  @property({ type: RunnerDamageScanner })
  public damageScanner: RunnerDamageScanner | null = null;

  @property({ type: RunnerWorld })
  public runnerWorld: RunnerWorld | null = null;

  @property({ type: RunnerBalanceScore })
  public balanceScore: RunnerBalanceScore | null = null;

  @property({ type: RunnerMoneyPraise })
  public moneyPraise: RunnerMoneyPraise | null = null;

  @property
  public moneyPickupPoints = 23;

  @property
  public paypalPickupPoints = 124;

  @property({ type: [Node] })
  public moneyNodes: Node[] = [];

  @property
  public flyDuration = 0.45;

  @property
  public shrinkEndScale = 0.12;

  @property
  public requireScrolling = true;

  @property
  public collectDescendantSprites = true;

  private _playerUi: UITransform | null = null;

  private _states: FlyState[] = [];

  private _wasOverlap = new Map<string, boolean>();

  onLoad() {
    this._buildStates();
    if (!this.playerNode) {
      this.playerNode = this._findByName('Player');
    }
    if (!this.runnerWorld) {
      const scene = director.getScene();
      if (scene) {
        const list = scene.getComponentsInChildren(RunnerWorld);
        this.runnerWorld = list.length > 0 ? list[0] : null;
      }
    }
    if (!this.balanceScore && this.balanceTarget?.isValid) {
      this.balanceScore =
        this.balanceTarget.getComponent(RunnerBalanceScore) ||
        this.balanceTarget.getComponentInChildren(RunnerBalanceScore);
    }
    if (!this.moneyPraise) {
      const scene = director.getScene();
      this.moneyPraise =
        this.node.getComponent(RunnerMoneyPraise) ||
        this.node.getComponentInChildren(RunnerMoneyPraise) ||
        this.node.parent?.getComponentInChildren(RunnerMoneyPraise) ||
        scene?.getComponentInChildren(RunnerMoneyPraise) ||
        null;
    }
  }

  start() {
    this._refreshPlayerHitUi();
    if (!this.balanceScore && this.balanceTarget?.isValid) {
      this.balanceScore =
        this.balanceTarget.getComponent(RunnerBalanceScore) ||
        this.balanceTarget.getComponentInChildren(RunnerBalanceScore);
    }
    if (!this.moneyPraise) {
      const scene = director.getScene();
      this.moneyPraise =
        this.node.getComponent(RunnerMoneyPraise) ||
        this.node.getComponentInChildren(RunnerMoneyPraise) ||
        this.node.parent?.getComponentInChildren(RunnerMoneyPraise) ||
        scene?.getComponentInChildren(RunnerMoneyPraise) ||
        null;
    }
  }

  update(dt: number) {
    if (!this._playerUi?.node?.isValid) {
      this._refreshPlayerHitUi();
    }
    if (!this.balanceTarget?.isValid) {
      return;
    }
    if (this.requireScrolling && !this.runnerWorld?.scrolling) {
      return;
    }
    const pbox = this._playerBox();
    for (let i = 0; i < this._states.length; i++) {
      const st = this._states[i];
      if (st.done) {
        continue;
      }
      if (st.flying) {
        this._stepFly(st, dt);
        continue;
      }
      const ui = st.node.getComponent(UITransform);
      if (!ui || !pbox) {
        continue;
      }
      const id = st.node.uuid;
      const mbox = ui.getBoundingBoxToWorld();
      const touch = pbox.intersects(mbox);
      const was = this._wasOverlap.get(id) ?? false;
      this._wasOverlap.set(id, touch);
      if (touch && !was) {
        this._awardPickup(st.node);
        this._beginFly(st);
      }
    }
  }

  private _awardPickup(node: Node) {
    const pts = this._pointsForPickup(node);
    this.balanceScore?.addPoints(pts);
    RunnerAudioManager.inst?.playCollect();
    this.moneyPraise?.onMoneyPicked(node);
  }

  public getTrackedMoneyNodes(): Node[] {
    const out: Node[] = [];
    for (let i = 0; i < this._states.length; i++) {
      const n = this._states[i].node;
      if (n?.isValid) {
        out.push(n);
      }
    }
    return out;
  }

  private _pointsForPickup(node: Node): number {
    const key = node.name.toLowerCase().replace(/\s+/g, '');
    if (key.includes('paypal')) {
      return Math.max(0, this.paypalPickupPoints);
    }
    return Math.max(0, this.moneyPickupPoints);
  }

  private _buildStates() {
    this._states = [];
    const self = this.node;
    let list: Node[] = [];
    if (this.moneyNodes.length > 0) {
      list = this.moneyNodes.filter((n) => n?.isValid && n !== self);
    } else if (this.collectDescendantSprites) {
      list = this._collectSpritePickups(self);
    } else {
      list = self.children.filter((c) => c?.isValid && c !== self);
    }
    for (let i = 0; i < list.length; i++) {
      const n = list[i];
      if (!n?.isValid) {
        continue;
      }
      if (!n.getComponent(UITransform)) {
        continue;
      }
      if (!n.getComponent(Sprite)) {
        continue;
      }
      this._states.push({
        node: n,
        flying: false,
        done: false,
        elapsed: 0,
        w0: new Vec3(),
        w1: new Vec3(),
        s0: new Vec3(),
      });
    }
  }

  private _collectSpritePickups(root: Node): Node[] {
    const out: Node[] = [];
    const walk = (n: Node) => {
      const ch = n.children;
      for (let i = 0; i < ch.length; i++) {
        const c = ch[i];
        if (!c?.isValid || c === root) {
          continue;
        }
        if (c.getComponent(UITransform) && c.getComponent(Sprite)) {
          out.push(c);
        }
        walk(c);
      }
    };
    walk(root);
    return out;
  }

  private _playerBox() {
    if (!this._playerUi?.node?.isValid) {
      return null;
    }
    return this._playerUi.getBoundingBoxToWorld();
  }

  private _beginFly(st: FlyState) {
    st.flying = true;
    st.elapsed = 0;
    st.node.getWorldPosition(st.w0);
    this.balanceTarget!.getWorldPosition(st.w1);
    st.s0 = st.node.scale.clone();
  }

  private _stepFly(st: FlyState, dt: number) {
    st.elapsed += dt;
    const dur = Math.max(0.05, this.flyDuration);
    let t = st.elapsed / dur;
    if (t > 1) {
      t = 1;
    }
    const e = 1 - (1 - t) * (1 - t);
    const w = new Vec3();
    Vec3.lerp(w, st.w0, st.w1, e);
    st.node.setWorldPosition(w);
    const te = this.shrinkEndScale;
    const sx = st.s0.x * (1 - e) + te * e;
    const sy = st.s0.y * (1 - e) + te * e;
    st.node.setScale(sx, sy, st.s0.z);
    if (t >= 1) {
      st.done = true;
      st.node.active = false;
    }
  }

  private _findByName(name: string): Node | null {
    const scene = director.getScene();
    if (!scene) {
      return null;
    }
    const visit = (n: Node): Node | null => {
      if (n.name === name) {
        return n;
      }
      const ch = n.children;
      for (let i = 0; i < ch.length; i++) {
        const r = visit(ch[i]);
        if (r) {
          return r;
        }
      }
      return null;
    };
    const roots = scene.children;
    for (let i = 0; i < roots.length; i++) {
      const r = visit(roots[i]);
      if (r) {
        return r;
      }
    }
    return null;
  }

  private _refreshPlayerHitUi() {
    if (this.playerHitArea?.node?.isValid) {
      this._playerUi = this.playerHitArea;
      return;
    }
    if (this.damageScanner?.isValid) {
      const u = this.damageScanner.getHitUITransform();
      if (u?.node?.isValid) {
        this._playerUi = u;
        return;
      }
    }
    if (this.playerNode?.isValid) {
      const sc =
        this.playerNode.getComponent(RunnerDamageScanner) ||
        this.playerNode.getComponentInChildren(RunnerDamageScanner);
      if (sc?.isValid) {
        const u = sc.getHitUITransform();
        if (u?.node?.isValid) {
          this._playerUi = u;
          return;
        }
      }
      this._playerUi =
        this.playerNode.getComponent(UITransform) ||
        this.playerNode.getComponentInChildren(UITransform);
    }
  }
}
