import {
  _decorator,
  Animation,
  Component,
  Node,
  Sprite,
  SpriteFrame,
  UITransform,
  Vec3,
  assetManager,
  director,
} from 'cc';
import { RunnerWorld } from './RunnerWorld';
import { RunnerObstacle } from './RunnerObstacle';

const { ccclass, executionOrder, property } = _decorator;

const ENEMY_RUN_FRAME_UUIDS = [
  '7e2fee16-4084-47e1-bf0d-25ae0d2438a3@f9941',
  '833ac3c7-99fb-49cf-b2fa-8cfea7faeeed@f9941',
  '34d633cd-c618-425a-8b58-9edd76bcd40d@f9941',
  '490bec5e-f91f-4348-9837-5591ae5c7d91@f9941',
  '031fce70-c2b6-4def-af1e-27f24de1fc13@f9941',
  '33ecb1ab-d29e-4439-aea7-3c5d51fe151d@f9941',
];

const ENEMY_RUN_FRAME_TIMES = [0, 0.15, 0.3, 0.45, 0.6, 0.75];

@ccclass('EnemyRunAnimator')
@executionOrder(10000)
export class EnemyRunAnimator extends Component {
  @property({ type: RunnerWorld })
  public runnerWorld: RunnerWorld | null = null;

  @property({ type: Node })
  public playerNode: Node | null = null;

  @property
  public relocateOnStart = false;

  @property({
    displayName: 'Spawn Offset X',
    range: [200, 1200, 10],
    slide: true,
  })
  public spawnOffsetX = 720;

  @property({
    displayName: 'Spawn Y Offset',
    range: [-200, 200, 1],
    slide: true,
  })
  public spawnYOffset = 0;

  @property({ type: [Node] })
  public runSpriteNodes: Node[] = [];

  @property({ type: [SpriteFrame] })
  public runFrames: SpriteFrame[] = [];

  @property
  public loopDuration = 0.7666666666666667;

  @property
  public approachSpeed = 0;

  @property({
    displayName: 'Chase Extra Speed',
    range: [0, 600, 10],
    slide: true,
  })
  public chaseExtraSpeed = 200;

  @property({
    displayName: 'Damage Hit Inset X',
    range: [0, 0.45, 0.01],
    slide: true,
  })
  public damageHitInsetX = 0.22;

  @property({
    displayName: 'Damage Hit Inset Y',
    range: [0, 0.45, 0.01],
    slide: true,
  })
  public damageHitInsetY = 0.18;

  private _sprites: Sprite[] = [];

  private _frames: SpriteFrame[] = [];

  private _running = false;

  private _elapsed = 0;

  private _loading = false;

  private readonly _pos = new Vec3();

  private readonly _initialPos = new Vec3();

  onLoad() {
    if (!this.runnerWorld) {
      const scene = director.getScene();
      const list = scene?.getComponentsInChildren(RunnerWorld) ?? [];
      this.runnerWorld = list.length > 0 ? list[0] : null;
    }
    if (!this.playerNode) {
      this.playerNode = this._findByName('Player');
    }
    this.node.getPosition(this._initialPos);
    this._syncVisualChildren();
    this._ensureSkippedFromWorldScroll();
    this._ensureDamageObstacle();
    this._disableLegacyAnimation();
    this.node.active = true;
  }

  start() {
    this._syncVisualChildren();
    this._refreshDisplay();
    this._loadFrames(() => this._applyFirstFrame());
  }

  lateUpdate(dt: number) {
    this._tickRunFrames(dt);
    this._tickApproachPlayer(dt);
  }

  public stopGameplayLoop() {
    this._running = false;
  }

  public startGameplayLoop() {
    if (this._running) {
      return;
    }
    this._syncVisualChildren();
    this._refreshDisplay();
    if (!this._frames.length) {
      this._loadFrames(() => this.startGameplayLoop());
      return;
    }
    this._applySpawnOnStart();
    this._applyFirstFrame();
    this.node.active = true;
    this._running = true;
    this._elapsed = 0;
  }

  private _syncVisualChildren() {
    const nodes = this._resolveRunSpriteNodes();
    for (let i = 0; i < nodes.length; i++) {
      const c = nodes[i];
      if (!c?.isValid) {
        continue;
      }
      c.setPosition(0, 0, 0);
      c.active = true;
    }
  }

  private _resolveRunSpriteNodes(): Node[] {
    const assigned = this.runSpriteNodes.filter((n) => n?.isValid);
    if (assigned.length) {
      return assigned;
    }
    const out: Node[] = [];
    const ch = this.node.children;
    for (let i = 0; i < ch.length; i++) {
      const c = ch[i];
      if (c?.isValid && this._isRunSpriteNode(c)) {
        out.push(c);
      }
    }
    return out;
  }

  private _isRunSpriteNode(n: Node): boolean {
    const key = n.name.toLowerCase().replace(/\s+/g, '');
    if (key.includes('enemyrun')) {
      return true;
    }
    return !!n.getComponent(Sprite) || !!n.getComponentInChildren(Sprite);
  }

  private _refreshDisplay() {
    this._collectSprites();
    this._syncEnemyHitSize();
    this._bootstrapFramesFromSprites();
    this._applyFirstFrame();
  }

  private _disableLegacyAnimation() {
    const legacy = this.getComponent(Animation);
    if (!legacy) {
      return;
    }
    legacy.playOnLoad = false;
    legacy.stop();
    legacy.enabled = false;
  }

  private _bootstrapFramesFromSprites() {
    if (this._frames.length) {
      return;
    }
    for (let i = 0; i < this._sprites.length; i++) {
      const sf = this._sprites[i]?.spriteFrame;
      if (sf) {
        this._frames = [sf];
        return;
      }
    }
    const assigned = this.runFrames.filter((f) => f && f.isValid);
    if (assigned.length) {
      this._frames = assigned;
    }
  }

  private _resolveApproachSpeed(): number {
    const worldSpeed = this.runnerWorld?.speed ?? 0;
    if (this.approachSpeed > 0) {
      return this.approachSpeed;
    }
    return worldSpeed + Math.max(0, this.chaseExtraSpeed);
  }

  private _tickRunFrames(dt: number) {
    if (
      !this._running ||
      !this.runnerWorld?.scrolling ||
      !this._frames.length ||
      !this._sprites.length
    ) {
      return;
    }
    const moveSpeed = this._resolveApproachSpeed();
    const worldSpeed = this.runnerWorld?.speed ?? moveSpeed;
    const animRate = worldSpeed > 0 ? moveSpeed / worldSpeed : 1;
    this._elapsed += dt * animRate;
    const dur = Math.max(0.05, this.loopDuration);
    const maxT = ENEMY_RUN_FRAME_TIMES[ENEMY_RUN_FRAME_TIMES.length - 1];
    const t = ((this._elapsed % dur) / dur) * maxT;
    let idx = 0;
    for (let i = ENEMY_RUN_FRAME_TIMES.length - 1; i >= 0; i--) {
      if (t >= ENEMY_RUN_FRAME_TIMES[i]) {
        idx = i;
        break;
      }
    }
    const sf = this._frames[idx] ?? this._frames[0];
    if (!sf) {
      return;
    }
    for (let i = 0; i < this._sprites.length; i++) {
      const sp = this._sprites[i];
      if (sp?.isValid) {
        sp.spriteFrame = sf;
        sp.enabled = true;
      }
    }
  }

  private _tickApproachPlayer(dt: number) {
    if (!this._running || !this.runnerWorld?.scrolling) {
      return;
    }
    const speed = this._resolveApproachSpeed();
    if (speed <= 0) {
      return;
    }
    this.node.getPosition(this._pos);
    this._pos.x -= speed * dt;
    this.node.setPosition(this._pos);
  }

  private _ensureSkippedFromWorldScroll() {
    const rw = this.runnerWorld;
    if (!rw) {
      return;
    }
    rw.registerScrollSkipNode(this.node.name);
  }

  private _ensureDamageObstacle() {
    this._stripChildObstacles();
    if (!this.node.getComponent(UITransform)) {
      this.node.addComponent(UITransform);
    }
    let obs = this.node.getComponent(RunnerObstacle);
    if (!obs) {
      obs = this.node.addComponent(RunnerObstacle);
    }
    obs.damage = 1;
    obs.activeDamage = true;
    obs.damageSourceId = `enemy:${this.node.uuid}`;
    obs.oneHitPerEncounter = true;
    obs.hitInsetX = this.damageHitInsetX;
    obs.hitInsetY = this.damageHitInsetY;
  }

  private _stripChildObstacles() {
    const ch = this.node.children;
    for (let i = 0; i < ch.length; i++) {
      const childObs = ch[i].getComponent(RunnerObstacle);
      if (childObs) {
        childObs.destroy();
      }
    }
  }

  private _syncEnemyHitSize() {
    const sp = this._sprites[0];
    const childUi = sp?.node.getComponent(UITransform);
    const parentUi = this.node.getComponent(UITransform);
    if (!childUi || !parentUi) {
      return;
    }
    parentUi.setContentSize(childUi.width, childUi.height);
  }

  private _applySpawnOnStart() {
    if (this.relocateOnStart) {
      this._resetSpawnNearPlayer();
      return;
    }
    this.node.setPosition(this._initialPos);
    const s = this.node.scale;
    this.node.setScale(-Math.abs(s.x) || -1, Math.abs(s.y) || 1, s.z);
  }

  private _resetSpawnNearPlayer() {
    const player = this.playerNode;
    if (!player?.isValid) {
      return;
    }
    const px = player.position.x;
    this.node.setPosition(
      px + this.spawnOffsetX,
      this._initialPos.y + this.spawnYOffset,
      this._initialPos.z,
    );
    const s = this.node.scale;
    this.node.setScale(-Math.abs(s.x) || -1, Math.abs(s.y) || 1, s.z);
  }

  private _applyFirstFrame() {
    if (!this._frames.length) {
      return;
    }
    const sf = this._frames[0];
    if (!sf) {
      return;
    }
    for (let i = 0; i < this._sprites.length; i++) {
      const sp = this._sprites[i];
      if (sp?.isValid) {
        sp.spriteFrame = sf;
        sp.enabled = true;
      }
    }
  }

  private _collectSprites() {
    this._sprites = [];
    const nodes = this._resolveRunSpriteNodes();
    for (let i = 0; i < nodes.length; i++) {
      const c = nodes[i];
      if (!c?.isValid || !c.active) {
        continue;
      }
      const sp = c.getComponent(Sprite) ?? c.getComponentInChildren(Sprite);
      if (sp) {
        this._sprites.push(sp);
      }
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
      const kids = n.children;
      for (let i = 0; i < kids.length; i++) {
        const r = visit(kids[i]);
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

  private _loadFrames(onReady?: () => void) {
    if (this.runFrames.length) {
      this._frames = this.runFrames.filter((f) => f && f.isValid);
      if (this._frames.length) {
        onReady?.();
      }
      return;
    }
    if (this._loading) {
      return;
    }
    this._loading = true;
    const ordered: (SpriteFrame | null)[] = new Array(
      ENEMY_RUN_FRAME_UUIDS.length,
    ).fill(null);
    let left = ENEMY_RUN_FRAME_UUIDS.length;
    for (let i = 0; i < ENEMY_RUN_FRAME_UUIDS.length; i++) {
      const slot = i;
      assetManager.loadAny(
        { uuid: ENEMY_RUN_FRAME_UUIDS[i] },
        (err, asset) => {
          if (!err && asset) {
            ordered[slot] = asset as SpriteFrame;
          }
          left--;
          if (left <= 0) {
            this._loading = false;
            this._frames = ordered.filter(
              (f): f is SpriteFrame => !!f && f.isValid,
            );
            if (!this._frames.length) {
              this._bootstrapFramesFromSprites();
            }
            onReady?.();
          }
        },
      );
    }
  }
}
