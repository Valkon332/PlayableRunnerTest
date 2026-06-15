import {
  _decorator,
  Component,
  UITransform,
  director,
  Scene,
  Node,
  Rect,
  Sprite,
} from 'cc';
import { RunnerWorld } from './RunnerWorld';
import { RunnerHealth } from './RunnerHealth';
import { RunnerObstacle } from './RunnerObstacle';
import { PlayerRunnerAnimator } from './PlayerRunnerAnimator';
import { RunnerAudioManager } from './RunnerAudioManager';

const { ccclass, property } = _decorator;

@ccclass('RunnerDamageScanner')
export class RunnerDamageScanner extends Component {
  @property({ type: RunnerWorld })
  public runnerWorld: RunnerWorld | null = null;

  @property({ type: RunnerHealth })
  public health: RunnerHealth | null = null;

  @property({ type: PlayerRunnerAnimator })
  public animator: PlayerRunnerAnimator | null = null;

  @property
  public invulnDuration = 1.2;

  private _ui: UITransform | null = null;

  private _invuln = 0;

  private _everDamaged = new Set<string>();

  private _separateTime = new Map<string, number>();

  private _wasOverlap = new Map<string, boolean>();

  public getHitUITransform(): UITransform | null {
    if (!this._ui) {
      return null;
    }
    const idle = this._ui.node.getChildByName('PlayerIdle');
    if (idle?.isValid) {
      const idleUi = idle.getComponent(UITransform);
      if (idleUi && idle.getComponent(Sprite)) {
        return idleUi;
      }
    }
    if (this._ui.node.getComponent(Sprite)) {
      return this._ui;
    }
    const sp = this._ui.node.getComponentInChildren(Sprite);
    return sp?.node.getComponent(UITransform) ?? this._ui;
  }

  onLoad() {
    this._ui =
      this.getComponent(UITransform) ||
      this.getComponentInChildren(UITransform);
    if (!this.health) {
      this.health = this.getComponent(RunnerHealth);
    }
    if (!this.animator) {
      this.animator = this.getComponent(PlayerRunnerAnimator);
    }
  }

  update(dt: number) {
    if (this._invuln > 0) {
      this._invuln -= dt;
    }
    const scene = director.getScene();
    if (!scene || !this._ui || !this.health) {
      return;
    }
    if (!this.runnerWorld?.scrolling || !this.health.isAlive) {
      return;
    }
    const playerBox = this._ui.getBoundingBoxToWorld();
    const obstacles = this._collectObstacles(scene);
    let dealtDamage = false;
    for (let i = 0; i < obstacles.length; i++) {
      const obs = obstacles[i];
      if (!obs?.activeDamage || !obs.node?.activeInHierarchy) {
        continue;
      }
      const ot = this._resolveHitTransform(obs);
      if (!ot) {
        continue;
      }
      const key = this._overlapKey(obs);
      const obox = this._obstacleHitBox(ot, obs);
      const touch = playerBox.intersects(obox);
      this._tickSeparation(key, touch, dt, obs);
      if (!touch || this._invuln > 0 || dealtDamage) {
        this._wasOverlap.set(key, touch);
        continue;
      }
      if (obs.oneHitPerEncounter) {
        if (this._everDamaged.has(key)) {
          this._wasOverlap.set(key, touch);
          continue;
        }
        this._applyDamage(obs);
        this._everDamaged.add(key);
        obs.activeDamage = false;
        dealtDamage = true;
        if (!this.health.isAlive) {
          this.runnerWorld?.setScrolling(false);
        }
        this._wasOverlap.set(key, touch);
        continue;
      }
      const was = this._wasOverlap.get(key) ?? false;
      if (was) {
        this._wasOverlap.set(key, touch);
        continue;
      }
      this._applyDamage(obs);
      dealtDamage = true;
      if (!this.health.isAlive) {
        this.runnerWorld?.setScrolling(false);
      }
      this._wasOverlap.set(key, touch);
    }
  }

  private _applyDamage(obs: RunnerObstacle) {
    this.health?.takeDamage(obs.damage);
    this._invuln = this.invulnDuration;
    RunnerAudioManager.inst?.playHurt();
    this.animator?.playHitThenResume();
  }

  private _tickSeparation(
    key: string,
    touch: boolean,
    dt: number,
    obs: RunnerObstacle,
  ) {
    if (obs.oneHitPerEncounter) {
      return;
    }
    if (touch) {
      this._separateTime.set(key, 0);
      return;
    }
    const rearmSec = Math.max(0.05, obs.rearmSeparationSec);
    const gap = (this._separateTime.get(key) ?? 0) + dt;
    this._separateTime.set(key, gap);
    if (gap >= rearmSec) {
      this._everDamaged.delete(key);
      this._wasOverlap.set(key, false);
    }
  }

  private _overlapKey(obs: RunnerObstacle): string {
    if (obs.damageSourceId) {
      return obs.damageSourceId;
    }
    const root = this._damageGroupRoot(obs.node);
    return root.uuid;
  }

  private _damageGroupRoot(node: Node): Node {
    let current: Node = node;
    let root = node;
    while (current.parent?.isValid) {
      const parent = current.parent;
      if (parent.getComponent(RunnerObstacle)) {
        root = parent;
        current = parent;
        continue;
      }
      break;
    }
    return root;
  }

  private _resolveHitTransform(obs: RunnerObstacle): UITransform | null {
    const own = obs.getComponent(UITransform);
    if (obs.node.getComponent(Sprite)) {
      return own;
    }
    const spriteChild = obs.node.getComponentInChildren(Sprite);
    const childUi = spriteChild?.node.getComponent(UITransform);
    return childUi ?? own;
  }

  private _obstacleHitBox(ot: UITransform, obs: RunnerObstacle): Rect {
    const box = ot.getBoundingBoxToWorld();
    const ix = box.width * Math.min(0.45, Math.max(0, obs.hitInsetX));
    const iy = box.height * Math.min(0.45, Math.max(0, obs.hitInsetY));
    const w = Math.max(0, box.width - ix * 2);
    const h = Math.max(0, box.height - iy * 2);
    return new Rect(box.x + ix, box.y + iy, w, h);
  }

  private _collectObstacles(scene: Scene): RunnerObstacle[] {
    const raw: RunnerObstacle[] = [];
    const visit = (node: Node) => {
      const list = node.getComponents(RunnerObstacle);
      for (let i = 0; i < list.length; i++) {
        raw.push(list[i]);
      }
      const kids = node.children;
      for (let i = 0; i < kids.length; i++) {
        visit(kids[i]);
      }
    };
    const roots = scene.children;
    for (let i = 0; i < roots.length; i++) {
      visit(roots[i]);
    }
    const unique = new Map<string, RunnerObstacle>();
    for (let i = 0; i < raw.length; i++) {
      const obs = raw[i];
      const key = this._overlapKey(obs);
      if (!unique.has(key)) {
        unique.set(key, obs);
      }
    }
    return Array.from(unique.values());
  }
}
