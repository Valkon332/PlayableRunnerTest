import {
  _decorator,
  Animation,
  Component,
  Node,
  director,
  Label,
  UITransform,
  Color,
  Font,
  assetManager,
} from 'cc';
import { EDITOR } from 'cc/env';
import { RunnerWorld } from './RunnerWorld';
import { PlayerRunnerAnimator } from './PlayerRunnerAnimator';

const { ccclass, property } = _decorator;

const DEFAULT_UI_FONT_UUID = 'f0fa0c07-ae6d-4f7a-a34c-db6bf5058482';

@ccclass('RunnerJumpTutorial')
export class RunnerJumpTutorial extends Component {
  @property({ type: RunnerWorld })
  public runnerWorld: RunnerWorld | null = null;

  @property({ type: Node })
  public playerNode: Node | null = null;

  @property({ type: Node })
  public firstEnemyNode: Node | null = null;

  @property({ type: Node })
  public textJumpNode: Node | null = null;

  @property({ type: PlayerRunnerAnimator })
  public playerAnimator: PlayerRunnerAnimator | null = null;

  @property({
    displayName: 'Trigger Distance',
    range: [50, 2000, 10],
    slide: true,
  })
  public triggerDistance = 80;

  private _armed = false;

  private _waitingTap = false;

  private _done = false;

  private _fontResolved: Font | null = null;

  private _textSpawnedAtRuntime = false;

  onLoad() {
    const scene = director.getScene();
    if (!this.runnerWorld) {
      const list = scene?.getComponentsInChildren(RunnerWorld) ?? [];
      this.runnerWorld = list.length > 0 ? list[0] : null;
    }
    if (!this.playerNode) {
      this.playerNode = this._findByName('Player');
    }
    if (!this.firstEnemyNode) {
      this.firstEnemyNode = this._findByName('Enemy');
    }
    if (!this.textJumpNode) {
      this.textJumpNode =
        this._findByName('TapToJumpText') ??
        this._findByName('TapToJump') ??
        this._findByName('Text jump');
    }
    if (this.textJumpNode?.isValid) {
      this._ensureTextOnUi(this.textJumpNode);
      this.textJumpNode.active = false;
    }
    if (!this.playerAnimator) {
      this.playerAnimator =
        this.playerNode?.getComponent(PlayerRunnerAnimator) ??
        scene?.getComponentInChildren(PlayerRunnerAnimator) ??
        null;
    }
    this._setTextVisible(false);
  }

  start() {
    this._setTextVisible(false);
  }

  onDestroy() {
    this._destroyRuntimeText();
  }

  public blocksJump(): boolean {
    return !this._done;
  }

  public armOnGameStart() {
    this._armed = true;
  }

  public dismissText() {
    this._waitingTap = false;
    this._setTextVisible(false);
    if (this._textSpawnedAtRuntime) {
      this._destroyRuntimeText();
      return;
    }
    if (this.textJumpNode?.isValid) {
      this.textJumpNode.active = false;
    }
  }

  public tryHandleTap(): boolean {
    if (!this._waitingTap) {
      return false;
    }
    this._waitingTap = false;
    this._done = true;
    this._setTextVisible(false);
    this._destroyRuntimeText();
    this.runnerWorld?.setScrolling(true);
    this.playerAnimator?.tryJump();
    return true;
  }

  update() {
    if (!this._armed || this._done || this._waitingTap) {
      return;
    }
    if (!this.runnerWorld?.scrolling) {
      return;
    }
    const player = this.playerNode;
    const enemy = this.firstEnemyNode;
    if (!player?.isValid || !enemy?.isValid) {
      return;
    }
    const gap = enemy.position.x - player.position.x;
    if (gap <= this.triggerDistance) {
      this._enterWaitState();
    }
  }

  private _enterWaitState() {
    this._waitingTap = true;
    this.runnerWorld?.setScrolling(false);
    this._pausePlayerRun();
    const text = this._ensureTextNode();
    if (text?.isValid) {
      text.setPosition(0, 120, 0);
      text.active = true;
    }
  }

  private _pausePlayerRun() {
    const anim = this._resolvePlayerAnimation();
    if (!anim || !this.playerAnimator?.runClipName) {
      return;
    }
    const st = anim.getState(this.playerAnimator.runClipName);
    st?.pause();
  }

  private _resolvePlayerAnimation(): Animation | null {
    const pa = this.playerAnimator;
    if (!pa) {
      return null;
    }
    return (
      pa.anim ??
      this.playerNode?.getComponent(Animation) ??
      this.playerNode?.getComponentInChildren(Animation) ??
      null
    );
  }

  private _setTextVisible(visible: boolean) {
    const n = this.textJumpNode;
    if (n?.isValid) {
      n.active = visible;
    }
  }

  private _ensureTextNode(): Node | null {
    if (EDITOR) {
      return null;
    }
    if (this.textJumpNode?.isValid) {
      return this.textJumpNode;
    }
    this.textJumpNode = this._findByName('Text jump');
    if (this.textJumpNode?.isValid) {
      this._ensureTextOnUi(this.textJumpNode);
      this.textJumpNode.active = false;
      return this.textJumpNode;
    }
    this.textJumpNode =
      this._findByName('TapToJumpText') ?? this._findByName('TapToJump');
    if (this.textJumpNode?.isValid) {
      this._ensureTextOnUi(this.textJumpNode);
      this.textJumpNode.active = false;
      return this.textJumpNode;
    }
    this.textJumpNode = this._createTextJumpNode();
    this._textSpawnedAtRuntime = true;
    return this.textJumpNode;
  }

  private _destroyRuntimeText() {
    if (!this._textSpawnedAtRuntime) {
      if (this.textJumpNode?.isValid) {
        this.textJumpNode.active = false;
      }
      return;
    }
    if (this.textJumpNode?.isValid) {
      this.textJumpNode.destroy();
    }
    this.textJumpNode = null;
    this._textSpawnedAtRuntime = false;
  }

  private _findByName(name: string): Node | null {
    const scene = director.getScene();
    if (!scene) {
      return null;
    }
    const key = name.toLowerCase().replace(/\s+/g, '');
    const visit = (n: Node): Node | null => {
      const nk = n.name.toLowerCase().replace(/\s+/g, '');
      if (nk === key) {
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

  private _createTextJumpNode(): Node {
    const host =
      this._findByName('UI') ??
      this._findByName('main') ??
      this.node;
    const n = new Node('Text jump');
    n.layer = host.layer;
    const tf = n.addComponent(UITransform);
    tf.setContentSize(420, 90);
    const lb = n.addComponent(Label);
    lb.string = 'Tap to jump';
    lb.fontSize = 40;
    lb.lineHeight = 50;
    lb.color = Color.WHITE;
    lb.horizontalAlign = Label.HorizontalAlign.CENTER;
    lb.verticalAlign = Label.VerticalAlign.CENTER;
    lb.enableOutline = true;
    lb.outlineColor = Color.BLACK;
    lb.outlineWidth = 3;
    host.addChild(n);
    n.setPosition(0, 120, 0);
    n.setSiblingIndex(host.children.length - 1);
    n.active = false;
    assetManager.loadAny({ uuid: DEFAULT_UI_FONT_UUID }, (err, asset) => {
      if (!err && asset && n.isValid) {
        this._fontResolved = asset as Font;
        lb.useSystemFont = false;
        lb.font = this._fontResolved;
      }
    });
    return n;
  }

  private _ensureTextOnUi(n: Node) {
    const ui = this._findByName('UI');
    if (!ui?.isValid || n.parent === ui) {
      return;
    }
    n.removeFromParent();
    n.layer = ui.layer;
    ui.addChild(n);
    n.setPosition(0, 120, 0);
    n.setSiblingIndex(ui.children.length - 1);
    n.active = false;
  }
}
