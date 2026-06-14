import {
  _decorator,
  Component,
  Node,
  Sprite,
  SpriteFrame,
  UITransform,
  assetManager,
  tween,
  Vec3,
  UIOpacity,
} from 'cc';

const { ccclass, property } = _decorator;

const CONFETTI_FRAME_UUIDS = [
  '55d42c48-746e-457b-b3ed-ee5949e4e498@f9941',
  '8e685158-32fc-446b-a4b6-88f2175f67ef@f9941',
  '52c58de4-6b29-4bdd-b906-0bdb81b69601@f9941',
  '33fe4121-f888-4a8a-ab44-ac0d98a121d2@f9941',
  'ca5ce7e5-ec28-49d4-ae4c-243c5cea2714@f9941',
  '8ae83348-3c61-4d8a-867c-7f21cf0f1146@f9941',
];

type ActivePiece = {
  node: Node;
  opacity: UIOpacity;
  vx: number;
  vy: number;
  spin: number;
  life: number;
  maxLife: number;
  fadeStarted: boolean;
};

@ccclass('VictoryConfetti')
export class VictoryConfetti extends Component {
  @property([SpriteFrame])
  public frames: SpriteFrame[] = [];

  @property
  public piecesPerSide = 18;

  @property
  public spawnDurationSec = 1.75;

  @property
  public burstIntervalSec = 0.26;

  @property
  public loopBursts = false;

  @property
  public pieceScaleMin = 1.1;

  @property
  public pieceScaleMax = 2.5;

  @property
  public cannonLocalY = -160;

  @property
  public cannonOutsideX = 24;

  @property({ range: [0, 40, 1], slide: true })
  public cannonSpawnJitter = 8;

  @property({ range: [20, 80, 1], slide: true })
  public shotAngleSpreadDeg = 44;

  @property
  public launchSpeedMin = 1180;

  @property
  public launchSpeedMax = 1520;

  @property
  public gravity = 1050;

  @property
  public pieceLifetime = 3.4;

  @property
  public fallFadeDuration = 1.1;

  @property
  public fallFadeVy = -120;

  private _root: Node | null = null;

  private _framesLoaded: SpriteFrame[] = [];

  private _loading = false;

  private _burstFn: (() => void) | null = null;

  private _spawning = false;

  private _spawnElapsed = 0;

  private _spawnedLeft = 0;

  private _spawnedRight = 0;

  private _targetPerSide = 0;

  private _active: ActivePiece[] = [];

  private _halfW = 360;

  private _halfH = 640;

  onLoad() {
    this._loadFrames();
    const ui = this.node.getComponent(UITransform);
    if (ui) {
      this._halfW = ui.width * 0.5;
      this._halfH = ui.height * 0.5;
    }
  }

  onDestroy() {
    this.stop();
  }

  update(dt: number) {
    this._tickSpawn(dt);
    if (!this._active.length) {
      return;
    }
    const g = Math.max(100, this.gravity);
    for (let i = this._active.length - 1; i >= 0; i--) {
      const p = this._active[i];
      const n = p.node;
      if (!n?.isValid) {
        this._active.splice(i, 1);
        continue;
      }
      p.life += dt;
      p.vy -= g * dt;
      const pos = n.position;
      n.setPosition(pos.x + p.vx * dt, pos.y + p.vy * dt, 0);
      n.angle += p.spin * dt;
      if (!p.fadeStarted && p.vy <= this.fallFadeVy) {
        p.fadeStarted = true;
        const fadeT = Math.max(0.2, this.fallFadeDuration);
        tween(p.opacity)
          .to(fadeT, { opacity: 0 })
          .start();
      }
      const x = n.position.x;
      const y = n.position.y;
      const out =
        p.life >= p.maxLife ||
        y < -this._halfH - 160 ||
        y > this._halfH + 220 ||
        x < -this._halfW - 220 ||
        x > this._halfW + 220;
      if (out) {
        n.destroy();
        this._active.splice(i, 1);
      }
    }
  }

  public play() {
    if (!this._framesLoaded.length && !this._loading) {
      this._loadFrames(() => this.play());
      return;
    }
    if (!this._framesLoaded.length) {
      return;
    }
    this.stop();
    this._ensureRoot();
    const ui = this.node.getComponent(UITransform);
    if (ui) {
      this._halfW = ui.width * 0.5;
      this._halfH = ui.height * 0.5;
    }
    this._beginSpawnStream();
    if (this.loopBursts && this.burstIntervalSec > 0) {
      this._burstFn = () => this._beginSpawnStream();
      this.schedule(this._burstFn, this.burstIntervalSec);
    } else {
      this._burstFn = null;
    }
  }

  public stop() {
    this._spawning = false;
    if (this._burstFn) {
      this.unschedule(this._burstFn);
      this._burstFn = null;
    }
    for (let i = 0; i < this._active.length; i++) {
      const n = this._active[i].node;
      if (n?.isValid) {
        n.destroy();
      }
    }
    this._active.length = 0;
    if (!this._root?.isValid) {
      return;
    }
    const ch = this._root.children.slice();
    for (let i = 0; i < ch.length; i++) {
      ch[i].destroy();
    }
  }

  private _loadFrames(onReady?: () => void) {
    if (this.frames.length) {
      this._framesLoaded = this.frames.filter((f) => f && f.isValid);
      if (this._framesLoaded.length) {
        onReady?.();
        return;
      }
    }
    if (this._loading) {
      return;
    }
    this._loading = true;
    const out: SpriteFrame[] = [];
    let left = CONFETTI_FRAME_UUIDS.length;
    for (let i = 0; i < CONFETTI_FRAME_UUIDS.length; i++) {
      const uuid = CONFETTI_FRAME_UUIDS[i];
      assetManager.loadAny({ uuid }, (err, asset) => {
        if (!err && asset) {
          out.push(asset as SpriteFrame);
        }
        left--;
        if (left <= 0) {
          this._loading = false;
          this._framesLoaded = out;
          onReady?.();
        }
      });
    }
  }

  private _getFrames(): SpriteFrame[] {
    if (this.frames.length) {
      return this.frames;
    }
    return this._framesLoaded;
  }

  private _ensureRoot() {
    if (this._root?.isValid) {
      this._placeRoot();
      return;
    }
    this._root = new Node('ConfettiRoot');
    this._root.layer = this.node.layer;
    const rootUi = this._root.addComponent(UITransform);
    const parentUi = this.node.getComponent(UITransform);
    if (parentUi) {
      rootUi.setContentSize(parentUi.contentSize);
      rootUi.setAnchorPoint(parentUi.anchorPoint);
    }
    this.node.addChild(this._root);
    this._placeRoot();
  }

  private _placeRoot() {
    if (!this._root?.isValid) {
      return;
    }
    const parent = this.node;
    this._root.setSiblingIndex(Math.max(0, parent.children.length - 1));
  }

  private _beginSpawnStream() {
    if (!this._root?.isValid) {
      return;
    }
    this._targetPerSide = Math.min(300, Math.max(1, Math.floor(this.piecesPerSide)));
    this._spawning = true;
    this._spawnElapsed = 0;
    this._spawnedLeft = 0;
    this._spawnedRight = 0;
  }

  private _tickSpawn(dt: number) {
    if (!this._spawning || !this._root?.isValid) {
      return;
    }
    this._spawnElapsed += dt;
    const dur = Math.max(0.05, this.spawnDurationSec);
    const want = Math.floor(Math.min(1, this._spawnElapsed / dur) * this._targetPerSide);
    while (this._spawnedLeft < want) {
      this._spawnPiece(true);
      this._spawnedLeft++;
    }
    while (this._spawnedRight < want) {
      this._spawnPiece(false);
      this._spawnedRight++;
    }
    if (this._spawnElapsed < dur) {
      return;
    }
    while (this._spawnedLeft < this._targetPerSide) {
      this._spawnPiece(true);
      this._spawnedLeft++;
    }
    while (this._spawnedRight < this._targetPerSide) {
      this._spawnPiece(false);
      this._spawnedRight++;
    }
    this._spawning = false;
  }

  private _spawnPiece(fromLeft: boolean) {
    const frames = this._getFrames();
    if (!frames.length || !this._root?.isValid) {
      return;
    }
    const frame = frames[Math.floor(Math.random() * frames.length)];
    const n = new Node('confetti');
    n.layer = this._root.layer;
    const tf = n.addComponent(UITransform);
    const sp = n.addComponent(Sprite);
    sp.spriteFrame = frame;
    const fw = frame.originalSize?.width ?? frame.rect.width;
    const fh = frame.originalSize?.height ?? frame.rect.height;
    const sc =
      this.pieceScaleMin +
      Math.random() * Math.max(0.01, this.pieceScaleMax - this.pieceScaleMin);
    tf.setContentSize(fw * sc, fh * sc);
    const jitter = Math.max(0, this.cannonSpawnJitter);
    const jx = jitter > 0 ? (Math.random() - 0.5) * jitter : 0;
    const jy = jitter > 0 ? (Math.random() - 0.5) * jitter : 0;
    const startX =
      (fromLeft ? -this._halfW - this.cannonOutsideX : this._halfW + this.cannonOutsideX) + jx;
    const startY = this.cannonLocalY + jy;
    const spread = Math.max(5, this.shotAngleSpreadDeg);
    const centerDeg = fromLeft ? 58 : 122;
    const deg = centerDeg + (Math.random() - 0.5) * spread * 2;
    const rad = (deg * Math.PI) / 180;
    const speedMin = Math.max(200, this.launchSpeedMin);
    const speedMax = Math.max(speedMin + 1, this.launchSpeedMax);
    const speed = speedMin + Math.random() * (speedMax - speedMin);
    const vx = Math.cos(rad) * speed;
    const vy = Math.sin(rad) * speed;
    const spin = (fromLeft ? 1 : -1) * (240 + Math.random() * 420);
    n.setPosition(startX, startY, 0);
    n.setScale(0.15, 0.15, 1);
    n.angle = Math.random() * 360;
    this._root.addChild(n);
    tween(n)
      .to(0.06, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' })
      .start();
    let op = n.getComponent(UIOpacity);
    if (!op) {
      op = n.addComponent(UIOpacity);
    }
    op.opacity = 255;
    const maxLife = Math.max(1.2, this.pieceLifetime);
    this._active.push({
      node: n,
      opacity: op,
      vx,
      vy,
      spin,
      life: 0,
      maxLife,
      fadeStarted: false,
    });
  }
}
