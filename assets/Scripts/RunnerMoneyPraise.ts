import {
  _decorator,
  Component,
  Node,
  Prefab,
  Sprite,
  UITransform,
  Vec3,
  Animation,
  instantiate,
  director,
} from 'cc';
import { RunnerMoneyGroup } from './RunnerMoneyGroup';

const { ccclass, property } = _decorator;

type PraiseKind = 'great' | 'perfect';

type PraiseBinding = {
  kind: PraiseKind;
  template: Node;
  offset: Vec3;
};

@ccclass('RunnerMoneyPraise')
export class RunnerMoneyPraise extends Component {
  @property({ type: Node })
  public spawnRoot: Node | null = null;

  @property({ type: Prefab })
  public greatPrefab: Prefab | null = null;

  @property({ type: Prefab })
  public perfectPrefab: Prefab | null = null;

  @property
  public matchMaxDx = 120;

  @property
  public praiseLifetime = 0.6;

  private _moneyGroup: RunnerMoneyGroup | null = null;

  private _greatTemplate: Node | null = null;

  private _perfectTemplate: Node | null = null;

  private _bindings = new Map<string, PraiseBinding>();

  private _played = new Set<string>();

  onLoad() {
    this._resolveTemplates();
    this._moneyGroup =
      this.node.getComponent(RunnerMoneyGroup) ||
      this.node.parent?.getComponent(RunnerMoneyGroup) ||
      this.node.getComponentInChildren(RunnerMoneyGroup) ||
      this.node.parent?.getComponentInChildren(RunnerMoneyGroup) ||
      null;
    if (!this._moneyGroup) {
      const scene = director.getScene();
      const list = scene?.getComponentsInChildren(RunnerMoneyGroup) ?? [];
      this._moneyGroup = list.length > 0 ? list[0] : null;
    }
  }

  start() {
    this._buildBindings();
  }

  public onMoneyPicked(moneyNode: Node) {
    if (!moneyNode?.isValid) {
      return;
    }
    const id = moneyNode.uuid;
    if (this._played.has(id)) {
      return;
    }
    const binding = this._bindings.get(id);
    if (!binding) {
      return;
    }
    this._played.add(id);
    this._spawnPraise(binding, moneyNode);
  }

  private _resolveTemplates() {
    const root = this.node;
    const ch = root.children;
    for (let i = 0; i < ch.length; i++) {
      const n = ch[i];
      if (!n?.isValid) {
        continue;
      }
      const key = n.name.toLowerCase().replace(/\s+/g, '');
      if (key.includes('great')) {
        this._greatTemplate = n;
      } else if (key.includes('perfect')) {
        this._perfectTemplate = n;
      }
    }
  }

  private _buildBindings() {
    this._bindings.clear();
    const moneys = this._collectMoneyNodes();
    if (!moneys.length) {
      return;
    }
    const markers: Array<{ kind: PraiseKind; node: Node }> = [];
    if (this._greatTemplate?.isValid) {
      markers.push({ kind: 'great', node: this._greatTemplate });
    }
    if (this._perfectTemplate?.isValid) {
      markers.push({ kind: 'perfect', node: this._perfectTemplate });
    }
    for (let i = 0; i < markers.length; i++) {
      const mk = markers[i];
      const money = this._findMoneyBelow(mk.node, moneys);
      if (!money?.isValid) {
        continue;
      }
      const mw = money.worldPosition;
      const lw = mk.node.worldPosition;
      this._bindings.set(money.uuid, {
        kind: mk.kind,
        template: mk.node,
        offset: new Vec3(lw.x - mw.x, lw.y - mw.y, lw.z - mw.z),
      });
      mk.node.active = false;
    }
  }

  private _collectMoneyNodes(): Node[] {
    const group = this._moneyGroup;
    if (group?.isValid) {
      const tracked = group.getTrackedMoneyNodes();
      if (tracked.length) {
        return tracked;
      }
    }
    const root =
      group?.node ??
      this.node.parent ??
      director.getScene()?.getChildByName('WorldScroll') ??
      this.node;
    const out: Node[] = [];
    const walk = (n: Node) => {
      const ch = n.children;
      for (let i = 0; i < ch.length; i++) {
        const c = ch[i];
        if (!c?.isValid) {
          continue;
        }
        if (c.getComponent(UITransform) && c.getComponent(Sprite)) {
          const name = c.name.toLowerCase();
          if (name.includes('money')) {
            out.push(c);
          }
        }
        walk(c);
      }
    };
    if (root?.isValid) {
      walk(root);
    }
    return out;
  }

  private _findMoneyBelow(marker: Node, moneys: Node[]): Node | null {
    const lp = marker.worldPosition;
    let best: Node | null = null;
    let bestDx = Infinity;
    for (let i = 0; i < moneys.length; i++) {
      const m = moneys[i];
      if (!m?.isValid) {
        continue;
      }
      const mp = m.worldPosition;
      if (lp.y <= mp.y) {
        continue;
      }
      const dx = Math.abs(mp.x - lp.x);
      if (dx > this.matchMaxDx || dx >= bestDx) {
        continue;
      }
      bestDx = dx;
      best = m;
    }
    return best;
  }

  private _spawnPraise(binding: PraiseBinding, moneyNode: Node) {
    const prefab =
      binding.kind === 'great' ? this.greatPrefab : this.perfectPrefab;
    let n: Node | null = null;
    if (prefab) {
      n = instantiate(prefab);
    } else if (binding.template?.isValid) {
      n = instantiate(binding.template);
    }
    if (!n?.isValid) {
      return;
    }
    const parent =
      this.spawnRoot ??
      this.node.parent ??
      this.node;
    parent.addChild(n);
    const wp = moneyNode.worldPosition;
    n.setWorldPosition(
      wp.x + binding.offset.x,
      wp.y + binding.offset.y,
      wp.z + binding.offset.z,
    );
    n.active = true;
    n.setScale(0, 0, 1);
    const anim = n.getComponent(Animation);
    if (anim) {
      const clip =
        anim.defaultClip?.name ??
        (anim.clips.length > 0 ? anim.clips[0].name : '');
      if (clip) {
        anim.play(clip);
      }
    }
    const life = Math.max(0.1, this.praiseLifetime);
    this.scheduleOnce(() => {
      if (n?.isValid) {
        n.destroy();
      }
    }, life);
  }
}
