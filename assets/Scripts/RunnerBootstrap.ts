import {
  _decorator,
  Component,
  Node,
  input,
  Input,
  EventMouse,
  EventTouch,
  UIOpacity,
  UITransform,
  director,
  Label,
  Color,
  Sprite,
  Animation,
  AnimationClip,
  tween,
  Tween,
  Vec3,
  Font,
  assetManager,
} from 'cc';
import { RunnerWorld } from './RunnerWorld';
import { PlayerRunnerAnimator } from './PlayerRunnerAnimator';
import { RunnerDamageScanner } from './RunnerDamageScanner';
import { RunnerBalanceScore } from './RunnerBalanceScore';
import { VictoryConfetti } from './VictoryConfetti';
import { EnemyRunAnimator } from './EnemyRunAnimator';
import { RunnerJumpTutorial } from './RunnerJumpTutorial';
import { OrientationLogoSwitch } from './OrientationLogoSwitch';
import { RunnerAudioManager } from './RunnerAudioManager';

const { ccclass, property } = _decorator;

const DEFAULT_UI_FONT_UUID = 'f0fa0c07-ae6d-4f7a-a34c-db6bf5058482';

@ccclass('RunnerBootstrap')
export class RunnerBootstrap extends Component {
  @property({ type: Font })
  public uiFont: Font | null = null;

  @property({ type: RunnerWorld })
  public runnerWorld: RunnerWorld | null = null;

  @property({ type: PlayerRunnerAnimator })
  public playerAnimator: PlayerRunnerAnimator | null = null;

  @property({ type: EnemyRunAnimator })
  public enemyRunAnimator: EnemyRunAnimator | null = null;

  @property({ type: Node })
  public tapHintNode: Node | null = null;

  @property({ type: Node })
  public handNode: Node | null = null;

  @property
  public handPulseClipName = 'HandPulse';

  @property({ type: Node })
  public ribbonNode: Node | null = null;

  @property({ type: Node })
  public finishBlockNode: Node | null = null;

  @property
  public victoryShowDelay = 0.5;

  @property({ type: Node })
  public blackoutNode: Node | null = null;

  @property({ type: Node })
  public downloadButton: Node | null = null;

  @property({ type: Node })
  public failNode: Node | null = null;

  @property
  public jumpDelayAfterStart = 0.15;

  @property
  public failShowSeconds = 3;

  @property
  public victoryIdleClipName = 'animationidle';

  @property
  public effectVictoryClipName = 'EffectScrol';

  @property({ range: [0, 220, 1], slide: true })
  public victoryTitlesMarginAboveScore = 88;

  @property({ range: [36, 120, 1], slide: true })
  public victoryTitleLineSpacing = 58;

  @property
  public pulseScaleHi = 1.07;

  @property
  public pulseHalfPeriodSec = 0.52;

  @property({ range: [0, 0.45, 0.01], slide: true })
  public finishPlayerInsetX = 0.28;

  @property({ range: [0, 0.45, 0.01], slide: true })
  public finishPlayerInsetY = 0.12;

  private _started = false;

  private _jumpReady = false;

  private _damageScanner: RunnerDamageScanner | null = null;

  private _ribbon1: Node | null = null;

  private _ribbon2: Node | null = null;

  private _ribbon1Hit = false;

  private _ribbon2Hit = false;

  private _finishBlock: Node | null = null;

  private _finishBlockHit = false;

  private _victoryPending = false;

  private _victoryShown = false;

  private _defeatShown = false;

  private _winnerButton: Node | null = null;

  private _winningScore: Node | null = null;

  private _effectNode: Node | null = null;

  private _buttonWinner: Node | null = null;

  private _downloadButton: Node | null = null;

  private _startLogo: Node | null = null;

  private _startButtonRoot: Node | null = null;

  private _buttonWinnerBaseColor: Color | null = null;

  private _failNodeResolved: Node | null = null;

  private _blackout: Node | null = null;

  private _mainUi: UITransform | null = null;

  private _victoryConfetti: VictoryConfetti | null = null;

  private _jumpTutorial: RunnerJumpTutorial | null = null;

  private _orientationLogoSwitch: OrientationLogoSwitch | null = null;

  private _handAnim: Animation | null = null;

  private _fontResolved: Font | null = null;

  onLoad() {
    if (this.uiFont) {
      this._fontResolved = this.uiFont;
    } else {
      assetManager.loadAny({ uuid: DEFAULT_UI_FONT_UUID }, (err, asset) => {
        if (!err && asset) {
          this._fontResolved = asset as Font;
        }
        if (this._victoryShown || this._defeatShown) {
          this._applyFontToFailLabels();
          this._refreshAllUiLabelsFont();
        }
      });
    }
    if (this.runnerWorld) {
      this.runnerWorld.setScrolling(false);
    }
    const scene = this.node.scene;
    const mainNode = this.node.name.toLowerCase() === 'main' ? this.node : this._findChildByNameCi(scene, 'main');
    this._mainUi = mainNode?.getComponent(UITransform) ?? null;
    if (mainNode?.isValid) {
      this._victoryConfetti =
        mainNode.getComponent(VictoryConfetti) ??
        mainNode.addComponent(VictoryConfetti);
      this._jumpTutorial =
        this._jumpTutorial ??
        mainNode.getComponent(RunnerJumpTutorial) ??
        mainNode.addComponent(RunnerJumpTutorial);
    }
    this._damageScanner =
      scene?.getComponentInChildren(RunnerDamageScanner) ?? null;
    const uiNode = this._findChildByNameCi(scene, 'UI');
    if (uiNode?.isValid) {
      this._orientationLogoSwitch =
        uiNode.getComponent(OrientationLogoSwitch) ??
        uiNode.addComponent(OrientationLogoSwitch);
    }
    this._ribbon1 = this.ribbonNode ?? this._findChildByNameCi(scene, 'Ribbon');
    this._ribbon2 = this._findChildByNameCi(scene, 'Ribbon2');
    this._finishBlock = this._resolveFinishBlock(scene);
    if (!this.enemyRunAnimator) {
      const animators = scene?.getComponentsInChildren(EnemyRunAnimator) ?? [];
      this.enemyRunAnimator = animators.length > 0 ? animators[0] : null;
    }
    if (!this.enemyRunAnimator) {
      const enemy = this._findChildByNameCi(scene, 'Enemy');
      if (enemy?.isValid) {
        this.enemyRunAnimator =
          enemy.getComponent(EnemyRunAnimator) ?? enemy.addComponent(EnemyRunAnimator);
      }
    }
    this._winnerButton = this._findChildByNameCi(scene, 'WinnerButton');
    this._winningScore = this._findChildByNameCi(scene, 'WinningScore');
    this._buttonWinner =
      this._findUnder(this._winnerButton, 'ButtonWinner') ??
      this._findChildByNameCi(scene, 'ButtonWinner');
    const buttonWinnerSprite = this._buttonWinner?.getComponent(Sprite);
    if (buttonWinnerSprite) {
      this._buttonWinnerBaseColor = buttonWinnerSprite.color.clone();
    }
    this._downloadButton =
      this.downloadButton ?? this._findChildByNameCi(scene, 'DownloadButton');
    this._startLogo = this._findChildByNameCi(scene, 'logo');
    this._startButtonRoot = this._findChildByNameCi(scene, 'Button');
    this._failNodeResolved =
      this.failNode ??
      this._findChildByNameCi(scene, 'Fail') ??
      this._findChildByNameCi(scene, 'fail');
    if (this._failNodeResolved?.isValid) {
      this._failNodeResolved.active = false;
    }
    this._effectNode =
      this._findChildByNameCi(scene, 'effects') ??
      this._findUnder(this._winnerButton, 'effects') ??
      this._findUnder(this._winnerButton, 'effect') ??
      this._findChildByNameCi(scene, 'effect');
    this._blackout = this._resolveBlackout();
    this._hideBlackout();
    if (!this.handNode) {
      this.handNode = this._findChildByNameCi(scene, 'Hand');
    }
    this._deactivateVictoryUi();
  }

  start() {
    this._startNodePulse(this._downloadButton);
    this._startHandPulse();
  }

  onDestroy() {
    this.unschedule(this._onVictoryDelayElapsed);
    this._unwireReplayOnButtonSubtree();
    if (this._buttonWinner) {
      Tween.stopAllByTarget(this._buttonWinner);
    }
    if (this._downloadButton) {
      Tween.stopAllByTarget(this._downloadButton);
    }
    if (this._failNodeResolved) {
      Tween.stopAllByTarget(this._failNodeResolved);
      const op = this._failNodeResolved.getComponent(UIOpacity);
      if (op) {
        Tween.stopAllByTarget(op);
      }
    }
  }

  update() {
    if (this._victoryShown || this._defeatShown) {
      return;
    }
    if (this._isPlayerDead()) {
      this._defeatShown = true;
      this.runnerWorld?.setScrolling(false);
      RunnerAudioManager.inst?.setRunning(false);
      this._presentDefeat();
      return;
    }
    if (!this._damageScanner) {
      return;
    }
    const hitUi = this._damageScanner.getHitUITransform();
    if (!hitUi) {
      return;
    }

    const playerSpriteUi = this._getPlayerSpriteUi(hitUi);
    if (!playerSpriteUi) {
      return;
    }

    const canCheckRibbons = !this._victoryShown && (this.runnerWorld?.scrolling || this._victoryPending);
    if (canCheckRibbons) {
      const r1 = this._ribbon1;
      if (r1?.isValid && !this._ribbon1Hit) {
        const r1Ui = r1.getComponent(UITransform);
        if (r1Ui && this._finishSpritesTouch(playerSpriteUi, r1Ui)) {
          this._ribbon1Hit = true;
          this._dropRibbonOnTouch(r1);
        }
      }

      const r2 = this._ribbon2;
      if (r2?.isValid && !this._ribbon2Hit) {
        const r2Ui = r2.getComponent(UITransform);
        if (r2Ui && this._finishSpritesTouch(playerSpriteUi, r2Ui)) {
          this._ribbon2Hit = true;
          this._dropRibbonOnTouch(r2);
        }
      }
    }

    if (
      this._victoryPending ||
      this._finishBlockHit ||
      !this._finishBlock?.isValid ||
      !this.runnerWorld?.scrolling
    ) {
      return;
    }
    const finishUi = this._finishBlock.getComponent(UITransform);
    if (!finishUi) {
      return;
    }
    if (!this._finishSpritesTouch(playerSpriteUi, finishUi)) {
      return;
    }
    this._finishBlockHit = true;
    this._victoryPending = true;
    this.runnerWorld.setScrolling(false);
    RunnerAudioManager.inst?.setRunning(false);
    this.playerAnimator?.stopRunToIdle();
    const delay = Math.max(0, this.victoryShowDelay);
    if (delay <= 0) {
      this._onVictoryDelayElapsed();
      return;
    }
    this.scheduleOnce(this._onVictoryDelayElapsed, delay);
  }

  private _onVictoryDelayElapsed = () => {
    this._victoryPending = false;
    if (this._victoryShown || this._defeatShown) {
      return;
    }
    this._victoryShown = true;
    this._presentVictory();
  };

  private _dropRibbonOnTouch(ribbon: Node) {
    this._pinAndSwingSingleRibbon(ribbon);
  }

  private _stickRibbonToStick(ribbon: Node) {
    if (!ribbon?.isValid) {
      return;
    }
    Tween.stopAllByTarget(ribbon);
    const stick =
      this._findAncestorStick(ribbon) ?? this._findNearestStickSibling(ribbon);
    if (!stick?.isValid) {
      return;
    }
    const wp = ribbon.worldPosition.clone();
    const wr = ribbon.worldRotation.clone();
    const ws = ribbon.worldScale.clone();
    ribbon.setParent(stick);
    ribbon.setWorldPosition(wp);
    ribbon.setWorldRotation(wr);
    ribbon.setWorldScale(ws);
    ribbon.setSiblingIndex(Math.max(0, stick.children.length - 1));
  }

  private _pinAndSwingRibbonsOnVictory() {
    this._pinAndSwingSingleRibbon(this._ribbon1);
    this._pinAndSwingSingleRibbon(this._ribbon2);
  }

  private _pinAndSwingSingleRibbon(ribbon: Node | null) {
    if (!ribbon?.isValid) {
      return;
    }

    this._stickRibbonToStick(ribbon);

    const base = -90;
    const amp = 10;
    Tween.stopAllByTarget(ribbon);
    tween(ribbon)
      .to(0.35, { angle: base }, { easing: 'quadOut' })
      .to(0.22, { angle: base + amp }, { easing: 'sineInOut' })
      .to(0.28, { angle: base - amp }, { easing: 'sineInOut' })
      .to(0.22, { angle: base + amp * 0.55 }, { easing: 'sineInOut' })
      .to(0.28, { angle: base - amp * 0.55 }, { easing: 'sineInOut' })
      .to(0.22, { angle: base }, { easing: 'sineInOut' })
      .start();
  }

  private _findAncestorStick(n: Node): Node | null {
    let cur: Node | null = n;
    while (cur?.isValid) {
      const name = cur.name.toLowerCase();
      if (name.startsWith('stick')) {
        return cur;
      }
      cur = cur.parent;
    }
    return null;
  }

  private _findNearestStickSibling(n: Node): Node | null {
    const p = n.parent;
    if (!p?.isValid) {
      return null;
    }
    const nx = n.worldPosition.x;
    let best: Node | null = null;
    let bestD = Infinity;
    const ch = p.children;
    for (let i = 0; i < ch.length; i++) {
      const c = ch[i];
      if (!c?.isValid) {
        continue;
      }
      const name = c.name.toLowerCase();
      if (!name.startsWith('stick')) {
        continue;
      }
      const d = Math.abs(c.worldPosition.x - nx);
      if (d < bestD) {
        bestD = d;
        best = c;
      }
    }
    return best;
  }

  onEnable() {
    input.on(Input.EventType.TOUCH_END, this._onPointer, this);
    input.on(Input.EventType.MOUSE_UP, this._onPointer, this);
  }

  onDisable() {
    input.off(Input.EventType.TOUCH_END, this._onPointer, this);
    input.off(Input.EventType.MOUSE_UP, this._onPointer, this);
  }

  private _startAllEnemyLoops() {
    const scene = this.node.scene;
    if (!scene) {
      this.enemyRunAnimator?.startGameplayLoop();
      return;
    }
    const animators = scene.getComponentsInChildren(EnemyRunAnimator);
    if (!animators.length) {
      this.enemyRunAnimator?.startGameplayLoop();
      return;
    }
    for (let i = 0; i < animators.length; i++) {
      animators[i]?.startGameplayLoop();
    }
  }

  private _stopAllEnemyLoops() {
    const scene = this.node.scene;
    if (!scene) {
      this.enemyRunAnimator?.stopGameplayLoop();
      return;
    }
    const animators = scene.getComponentsInChildren(EnemyRunAnimator);
    if (!animators.length) {
      this.enemyRunAnimator?.stopGameplayLoop();
      return;
    }
    for (let i = 0; i < animators.length; i++) {
      animators[i]?.stopGameplayLoop();
    }
  }

  private _onPointer(ev: EventTouch | EventMouse) {
    if (!this._isPointerInsideGameScreen(ev)) {
      return;
    }
    if (this._victoryShown || this._defeatShown) {
      return;
    }
    if (!this._started) {
      this._started = true;
      this._hideBlackout();
      this._jumpReady = false;
      RunnerAudioManager.inst?.unlockOnFirstTap();
      RunnerAudioManager.inst?.setRunning(true);
      this.runnerWorld?.setScrolling(true);
      this.playerAnimator?.enterGameplayRun();
      this._startAllEnemyLoops();
      this._hideNode(this.tapHintNode);
      this._hideNode(this.handNode);
      if (this._jumpTutorial) {
        this._jumpReady = false;
        this._jumpTutorial.armOnGameStart();
      } else {
        const t = Math.max(0, this.jumpDelayAfterStart);
        this.scheduleOnce(() => {
          this._jumpReady = true;
        }, t);
      }
      return;
    }
    if (this._jumpTutorial?.tryHandleTap()) {
      this._jumpReady = true;
      return;
    }
    if (this._jumpTutorial?.blocksJump()) {
      return;
    }
    if (!this._jumpReady) {
      return;
    }
    this.playerAnimator?.tryJump();
  }

  private _isPointerInsideGameScreen(ev: EventTouch | EventMouse): boolean {
    if (!this._mainUi?.node?.isValid) {
      this._mainUi =
        this._findChildByNameCi(this.node.scene, 'main')?.getComponent(UITransform) ?? null;
    }
    const ui = this._mainUi;
    if (!ui) {
      return false;
    }
    return ui.hitTest(ev.getLocation());
  }

  private _startHandPulse() {
    const root = this.handNode;
    if (!root?.isValid || !root.active) {
      return;
    }
    if (!this._handAnim?.isValid) {
      this._handAnim =
        root.getComponent(Animation) ??
        root.getComponentInChildren(Animation);
    }
    const anim = this._handAnim;
    if (!anim) {
      return;
    }
    const name = this.handPulseClipName.trim();
    if (!name) {
      return;
    }
    const state = anim.getState(name);
    if (!state) {
      return;
    }
    state.wrapMode = AnimationClip.WrapMode.Loop;
    state.speed = 1;
    anim.play(name);
  }

  private _hideNode(n: Node | null) {
    if (!n?.isValid) {
      return;
    }
    if (
      this.handNode?.isValid &&
      (n === this.handNode || n.isChildOf(this.handNode))
    ) {
      const anim =
        this._handAnim ??
        n.getComponent(Animation) ??
        n.getComponentInChildren(Animation);
      anim?.stop();
    }
    let op = n.getComponent(UIOpacity);
    if (!op) {
      op = n.addComponent(UIOpacity);
    }
    op.opacity = 0;
    n.active = false;
  }

  private _findChildByNameCi(root: Node | null, name: string): Node | null {
    if (!root?.isValid) {
      return null;
    }
    const want = name.toLowerCase();
    if (root.name.toLowerCase() === want) {
      return root;
    }
    const ch = root.children;
    for (let i = 0; i < ch.length; i++) {
      const r = this._findChildByNameCi(ch[i], name);
      if (r) {
        return r;
      }
    }
    return null;
  }

  private _findUnder(root: Node | null, name: string): Node | null {
    if (!root?.isValid) {
      return null;
    }
    const want = name.toLowerCase();
    const ch = root.children;
    for (let i = 0; i < ch.length; i++) {
      const c = ch[i];
      if (c.name.toLowerCase() === want) {
        return c;
      }
      const d = this._findUnder(c, name);
      if (d) {
        return d;
      }
    }
    return null;
  }

  private _uiRectsIntersect(a: UITransform, b: UITransform): boolean {
    const ac = this._uiWorldCorners(a);
    const bc = this._uiWorldCorners(b);
    return !this._hasSeparatingAxis(ac, bc) && !this._hasSeparatingAxis(bc, ac);
  }

  private _finishSpritesTouch(
    playerSpriteUi: UITransform,
    targetUi: UITransform | null,
  ): boolean {
    if (!targetUi) {
      return false;
    }
    const targetSpriteUi = this._spriteUiFrom(targetUi);
    const ac = this._uiWorldCornersInset(
      playerSpriteUi,
      Math.max(0, Math.min(0.45, this.finishPlayerInsetX)),
      Math.max(0, Math.min(0.45, this.finishPlayerInsetY)),
    );
    const bc = this._uiWorldCorners(targetSpriteUi);
    return !this._hasSeparatingAxis(ac, bc) && !this._hasSeparatingAxis(bc, ac);
  }

  private _getPlayerSpriteUi(playerRootUi: UITransform): UITransform | null {
    const playerNode = playerRootUi.node;
    const idle = playerNode.getChildByName('PlayerIdle');
    if (idle?.isValid) {
      const idleUi = idle.getComponent(UITransform);
      if (idleUi && idle.getComponent(Sprite)) {
        return idleUi;
      }
    }
    return this._spriteUiFrom(playerRootUi);
  }

  private _spriteUiFrom(ui: UITransform): UITransform {
    if (ui.node.getComponent(Sprite)) {
      return ui;
    }
    const sp = ui.node.getComponentInChildren(Sprite);
    return sp?.node.getComponent(UITransform) ?? ui;
  }

  private _uiWorldCorners(ui: UITransform): Vec3[] {
    return this._uiWorldCornersInset(ui, 0, 0);
  }

  private _uiWorldCornersInset(ui: UITransform, insetX: number, insetY: number): Vec3[] {
    const w = ui.width;
    const h = ui.height;
    const ix = w * insetX;
    const iy = h * insetY;
    const l = -ui.anchorX * w + ix;
    const r = (1 - ui.anchorX) * w - ix;
    const d = -ui.anchorY * h + iy;
    const u = (1 - ui.anchorY) * h - iy;
    return [
      ui.convertToWorldSpaceAR(new Vec3(l, d, 0)),
      ui.convertToWorldSpaceAR(new Vec3(l, u, 0)),
      ui.convertToWorldSpaceAR(new Vec3(r, u, 0)),
      ui.convertToWorldSpaceAR(new Vec3(r, d, 0)),
    ];
  }

  private _hasSeparatingAxis(a: Vec3[], b: Vec3[]): boolean {
    for (let i = 0; i < a.length; i++) {
      const p0 = a[i];
      const p1 = a[(i + 1) % a.length];
      const ax = -(p1.y - p0.y);
      const ay = p1.x - p0.x;
      let amin = Infinity;
      let amax = -Infinity;
      let bmin = Infinity;
      let bmax = -Infinity;
      for (let j = 0; j < a.length; j++) {
        const v = a[j].x * ax + a[j].y * ay;
        amin = Math.min(amin, v);
        amax = Math.max(amax, v);
      }
      for (let j = 0; j < b.length; j++) {
        const v = b[j].x * ax + b[j].y * ay;
        bmin = Math.min(bmin, v);
        bmax = Math.max(bmax, v);
      }
      if (amax < bmin || bmax < amin) {
        return true;
      }
    }
    return false;
  }

  private _isDescendantOf(node: Node, ancestor: Node): boolean {
    let p: Node | null = node;
    while (p) {
      if (p === ancestor) {
        return true;
      }
      p = p.parent;
    }
    return false;
  }

  private _isPlayerDead(): boolean {
    const health = this._damageScanner?.health;
    return !!health && !health.isAlive;
  }

  private _deactivateVictoryUi() {
    if (this._winnerButton?.isValid) {
      this._winnerButton.active = false;
    }
    if (!this._winningScore?.isValid) {
      return;
    }
    const pan = this._winningScore.parent;
    if (!pan?.isValid) {
      return;
    }
    if (
      this._winnerButton?.isValid &&
      this._isDescendantOf(this._winningScore, this._winnerButton)
    ) {
      return;
    }
    pan.active = false;
  }

  private _activateVictoryUi() {
    if (this._winnerButton?.isValid) {
      this._winnerButton.active = true;
    }
    if (!this._winningScore?.isValid) {
      return;
    }
    const pan = this._winningScore.parent;
    if (!pan?.isValid) {
      return;
    }
    if (
      this._winnerButton?.isValid &&
      this._isDescendantOf(this._winningScore, this._winnerButton)
    ) {
      return;
    }
    pan.active = true;
  }

  private _presentVictory() {
    RunnerAudioManager.inst?.playWin();
    this._jumpTutorial?.dismissText();
    this._showBlackout();
    this._restoreInstallButtonColor();
    this._activateVictoryUi();
    this._revealVictoryBalanceScore();
    this._playVictoryConfetti();
    this._playEffectVictoryAnimation();
    this._ensureResultTitles('Congratulations!', 'Choose your reward!');
    this._applyInstallLabel();
    this._startNodePulse(this._buttonWinner);
    this._wireReplayOnButtonSubtree();
    this.playerAnimator?.playClipLoop(this.victoryIdleClipName);
    this._refreshAllUiLabelsFont();
    this._pinAndSwingRibbonsOnVictory();
  }

  private _presentDefeat() {
    RunnerAudioManager.inst?.playLose();
    this._stopAllEnemyLoops();
    this._jumpTutorial?.dismissText();
    this._showBlackout();
    this._deactivateVictoryUi();
    this._hideDefeatOnlyStartUi();
    this.playerAnimator?.playClipLoop(this.playerAnimator.idleClipName);
    const fail = this._resolveFailNode();
    if (fail?.isValid) {
      this._showFailNode(fail);
    }
    const t = Math.max(0.1, this.failShowSeconds);
    this.scheduleOnce(() => {
      if (fail?.isValid) {
        this._hideFailNode(fail);
      }
      this._presentDefeatRewardUi();
    }, t);
  }

  private _presentDefeatRewardUi() {
    this._prepareResultUiFadeIn();
    this._activateVictoryUi();
    this._revealVictoryBalanceScore();
    this._playEffectVictoryAnimation();
    this._ensureResultTitles("You didn't make it!", 'Try again on the app!');
    this._applyInstallLabel();
    this._applyInstallButtonDefeatColor();
    this._startNodePulse(this._buttonWinner);
    this._wireReplayOnButtonSubtree();
    this._refreshAllUiLabelsFont();
    this._playResultUiFadeIn();
  }

  private _hideDefeatOnlyStartUi() {
    this._orientationLogoSwitch?.hideAll();
    this._hideNode(this._startButtonRoot);
    if (this._downloadButton) {
      Tween.stopAllByTarget(this._downloadButton);
    }
    this._hideNode(this._downloadButton);
  }

  private _prepareResultUiFadeIn() {
    const n = this._winnerButton;
    if (!n?.isValid) {
      return;
    }
    let op = n.getComponent(UIOpacity);
    if (!op) {
      op = n.addComponent(UIOpacity);
    }
    Tween.stopAllByTarget(n);
    Tween.stopAllByTarget(op);
    op.opacity = 0;
    n.setScale(0.92, 0.92, 1);
  }

  private _playResultUiFadeIn() {
    const n = this._winnerButton;
    if (!n?.isValid) {
      return;
    }
    const op = n.getComponent(UIOpacity);
    if (!op) {
      return;
    }
    Tween.stopAllByTarget(n);
    Tween.stopAllByTarget(op);
    tween(op).to(0.45, { opacity: 255 }).start();
    tween(n)
      .to(0.45, { scale: new Vec3(1, 1, 1) })
      .start();
  }

  private _revealVictoryBalanceScore() {
    const sc = this.node.scene;
    if (!sc?.isValid) {
      return;
    }
    const bs = sc.getComponentInChildren(RunnerBalanceScore);
    bs?.revealVictoryScore();
  }

  private _playVictoryConfetti() {
    this._victoryConfetti?.play();
  }

  private _playEffectVictoryAnimation() {
    if (!this._effectNode?.isValid) {
      return;
    }
    const anim =
      this._effectNode.getComponent(Animation) ||
      this._effectNode.getComponentInChildren(Animation);
    if (!anim) {
      return;
    }
    anim.stop();
    const candidates = [
      this.effectVictoryClipName,
      'EffectScrol',
      'Effect',
    ];
    for (let i = 0; i < candidates.length; i++) {
      const n = candidates[i];
      if (!n) {
        continue;
      }
      if (anim.getState(n)) {
        anim.play(n);
        return;
      }
    }
    const clips = anim.clips;
    if (clips?.length) {
      for (let j = 0; j < clips.length; j++) {
        const c = clips[j];
        if (c?.name) {
          anim.play(c.name);
          return;
        }
      }
    }
  }

  private _resolveFinishBlock(scene: Node | null): Node | null {
    if (this.finishBlockNode?.isValid) {
      return this.finishBlockNode;
    }
    const finish = this._findChildByNameCi(scene, 'Finish');
    const underFinish =
      this._findUnder(finish, 'FinishBlock') ??
      this._findUnder(finish, 'finishBlock');
    if (underFinish?.isValid) {
      return underFinish;
    }
    return this._findChildByNameCi(scene, 'finishblock');
  }

  private _resolveBlackout(): Node | null {
    if (this.blackoutNode?.isValid) {
      return this.blackoutNode;
    }
    const ui = this._findChildByNameCi(this.node.scene, 'UI');
    const underUi = this._findUnder(ui, 'Blackout');
    if (underUi?.isValid) {
      return underUi;
    }
    return this._findChildByNameCi(this.node.scene, 'blackout');
  }

  private _showBlackout() {
    const b = this._resolveBlackout();
    if (!b?.isValid) {
      return;
    }
    this._blackout = b;
    const ui = b.parent;
    if (ui?.isValid && ui.name.toLowerCase() === 'ui') {
      const afterCamera = Math.min(1, Math.max(0, ui.children.length - 1));
      b.setSiblingIndex(afterCamera);
    }
    const visual = b.children.length > 0 ? b.children[0] : b;
    let op = visual.getComponent(UIOpacity);
    if (!op) {
      op = visual.addComponent(UIOpacity);
    }
    op.opacity = 150;
    visual.active = true;
    b.active = true;
  }

  private _hideBlackout() {
    const b = this._blackout ?? this._resolveBlackout();
    if (!b?.isValid) {
      return;
    }
    this._blackout = b;
    b.active = false;
  }

  private _ensureResultTitles(mainText: string, subText: string) {
    if (!this._winningScore?.isValid) {
      return;
    }
    const pan = this._winningScore.parent;
    if (!pan?.isValid) {
      return;
    }
    const wsTf = this._winningScore.getComponent(UITransform);
    const y0 = this._winningScore.position.y;
    const sy = Math.abs(this._winningScore.scale.y) || 1;
    const rawHalf = ((wsTf?.height ?? 0) * sy) / 2;
    const halfH = rawHalf > 1 ? rawHalf : 118;
    const top = y0 + halfH + this.victoryTitlesMarginAboveScore;
    const congratsY = top + 26;
    const chooseY = congratsY - this.victoryTitleLineSpacing;
    const mk = (nodeName: string, text: string, y: number, fontSize: number) => {
      let n = this._findUnder(pan, nodeName);
      if (!n) {
        n = new Node(nodeName);
        const tf = n.addComponent(UITransform);
        tf.setContentSize(680, fontSize + 24);
        n.setPosition(0, y, 0);
        const lb = n.addComponent(Label);
        lb.string = text;
        lb.fontSize = fontSize;
        lb.color = Color.WHITE;
        lb.enableOutline = true;
        lb.outlineColor = Color.BLACK;
        lb.outlineWidth = 4;
        pan.addChild(n);
        n.setSiblingIndex(pan.children.length - 1);
        this._applyFontToLabel(n.getComponent(Label));
      } else {
        n.setPosition(0, y, 0);
        const lb = n.getComponent(Label);
        if (lb) {
          lb.string = text;
          lb.fontSize = fontSize;
          lb.color = Color.WHITE;
          lb.enableOutline = true;
          lb.outlineColor = Color.BLACK;
          lb.outlineWidth = 4;
        }
        this._applyFontToLabel(lb);
      }
    };
    mk('VictoryLineCongrats', mainText, congratsY, 52);
    mk('VictoryLineChoose', subText, chooseY, 34);
  }

  private _resolveFailNode(): Node | null {
    if (this._failNodeResolved?.isValid) {
      return this._failNodeResolved;
    }
    this._failNodeResolved =
      this.failNode ??
      this._findChildByNameCi(this.node.scene, 'Fail') ??
      this._findChildByNameCi(this.node.scene, 'fail') ??
      this._createFallbackFailNode();
    return this._failNodeResolved;
  }

  private _createFallbackFailNode(): Node {
    const root = new Node('Fail');
    root.layer = this.node.layer;
    const tf = root.addComponent(UITransform);
    tf.setContentSize(680, 190);
    root.setPosition(0, 150, 0);
    const main = new Node('FailMainText');
    main.layer = root.layer;
    const mainTf = main.addComponent(UITransform);
    mainTf.setContentSize(680, 92);
    main.setPosition(0, 34, 0);
    const mainLabel = main.addComponent(Label);
    mainLabel.string = "You didn't make it!";
    mainLabel.fontSize = 52;
    mainLabel.lineHeight = 58;
    mainLabel.horizontalAlign = Label.HorizontalAlign.CENTER;
    mainLabel.verticalAlign = Label.VerticalAlign.CENTER;
    mainLabel.color = Color.WHITE;
    mainLabel.enableOutline = true;
    mainLabel.outlineColor = Color.BLACK;
    mainLabel.outlineWidth = 4;
    const sub = new Node('FailSubText');
    sub.layer = root.layer;
    const subTf = sub.addComponent(UITransform);
    subTf.setContentSize(680, 62);
    sub.setPosition(0, -36, 0);
    const subLabel = sub.addComponent(Label);
    subLabel.string = 'Try again on the app!';
    subLabel.fontSize = 32;
    subLabel.lineHeight = 38;
    subLabel.horizontalAlign = Label.HorizontalAlign.CENTER;
    subLabel.verticalAlign = Label.VerticalAlign.CENTER;
    subLabel.color = Color.WHITE;
    subLabel.enableOutline = true;
    subLabel.outlineColor = Color.BLACK;
    subLabel.outlineWidth = 3;
    root.addChild(main);
    root.addChild(sub);
    this.node.addChild(root);
    root.setSiblingIndex(this.node.children.length - 1);
    this._applyFontToLabel(mainLabel);
    this._applyFontToLabel(subLabel);
    root.active = false;
    return root;
  }

  private _showFailNode(n: Node) {
    Tween.stopAllByTarget(n);
    this._applyFontToFailLabels();
    let op = n.getComponent(UIOpacity);
    if (!op) {
      op = n.addComponent(UIOpacity);
    }
    Tween.stopAllByTarget(op);
    n.active = true;
    n.setSiblingIndex(n.parent ? n.parent.children.length - 1 : 0);
    n.setScale(0.12, 0.12, 1);
    op.opacity = 0;
    tween(op).to(0.25, { opacity: 255 }).start();
    tween(n)
      .to(0.42, { scale: new Vec3(1.08, 1.08, 1) })
      .to(0.14, { scale: new Vec3(1, 1, 1) })
      .start();
  }

  private _hideFailNode(n: Node) {
    Tween.stopAllByTarget(n);
    const op = n.getComponent(UIOpacity);
    if (op) {
      Tween.stopAllByTarget(op);
      op.opacity = 0;
    }
    n.active = false;
    n.setScale(1, 1, 1);
  }

  private _applyFontToFailLabels() {
    if (!this._failNodeResolved?.isValid) {
      return;
    }
    const labels = this._failNodeResolved.getComponentsInChildren(Label);
    for (let i = 0; i < labels.length; i++) {
      this._applyFontToLabel(labels[i]);
    }
  }

  private _applyInstallLabel() {
    if (!this._buttonWinner?.isValid) {
      return;
    }
    const text = 'INSTALL AND EARN';
    const labels = this._buttonWinner.getComponentsInChildren(Label);
    if (labels.length === 0) {
      const cap = new Node('InstallCaption');
      cap.layer = this._buttonWinner.layer;
      const lb = cap.addComponent(Label);
      this._buttonWinner.addChild(cap);
      cap.setSiblingIndex(this._buttonWinner.children.length - 1);
      this._styleInstallLabel(lb, text);
      this._applyFontToLabel(lb);
      return;
    }
    for (let i = 0; i < labels.length; i++) {
      this._styleInstallLabel(labels[i], text);
      this._applyFontToLabel(labels[i]);
    }
  }

  private _styleInstallLabel(lb: Label, text: string) {
    if (!this._buttonWinner?.isValid || !lb?.isValid) {
      return;
    }
    const btnTf = this._buttonWinner.getComponent(UITransform);
    if (!btnTf) {
      return;
    }
    const w = btnTf.width;
    const h = btnTf.height;
    const padX = 12;
    const padY = 8;
    const boxW = Math.max(40, w - padX * 2);
    const boxH = Math.max(24, h - padY * 2);
    const cap = lb.node;
    let tf = cap.getComponent(UITransform);
    if (!tf) {
      tf = cap.addComponent(UITransform);
    }
    tf.setContentSize(boxW, boxH);
    tf.anchorX = 0.5;
    tf.anchorY = 0.5;
    cap.setPosition(0, 0, 0);
    lb.string = text;
    lb.horizontalAlign = Label.HorizontalAlign.CENTER;
    lb.verticalAlign = Label.VerticalAlign.CENTER;
    lb.overflow = Label.Overflow.SHRINK;
    lb.enableWrapText = false;
    const maxSize = Math.floor(boxH * 0.95);
    lb.fontSize = maxSize;
    lb.lineHeight = maxSize;
    lb.color = Color.WHITE;
    lb.enableOutline = true;
    lb.outlineColor = Color.BLACK;
    lb.outlineWidth = 3;
  }

  private _applyInstallButtonDefeatColor() {
    if (!this._buttonWinner?.isValid) {
      return;
    }
    const sp = this._buttonWinner.getComponent(Sprite);
    if (sp) {
      sp.color = new Color(255, 45, 45, 255);
    }
  }

  private _restoreInstallButtonColor() {
    if (!this._buttonWinner?.isValid || !this._buttonWinnerBaseColor) {
      return;
    }
    const sp = this._buttonWinner.getComponent(Sprite);
    if (sp) {
      sp.color = this._buttonWinnerBaseColor;
    }
  }

  private _startNodePulse(n: Node | null) {
    if (!n?.isValid) {
      return;
    }
    Tween.stopAllByTarget(n);
    n.setScale(1, 1, 1);
    const hi = Math.max(1.001, this.pulseScaleHi);
    const lo = 1;
    const half = Math.max(0.12, this.pulseHalfPeriodSec);
    const up = new Vec3(hi, hi, 1);
    const dn = new Vec3(lo, lo, 1);
    tween(n)
      .to(half, { scale: up })
      .to(half, { scale: dn })
      .union()
      .repeatForever()
      .start();
  }

  private _wireReplayOnButtonSubtree() {
    if (!this._buttonWinner?.isValid) {
      return;
    }
    this._unwireReplayOnButtonSubtree();
    const visit = (n: Node) => {
      n.on(Node.EventType.TOUCH_END, this._reloadScene, this);
      n.on(Node.EventType.MOUSE_UP, this._reloadScene, this);
      const kids = n.children;
      for (let i = 0; i < kids.length; i++) {
        visit(kids[i]);
      }
    };
    visit(this._buttonWinner);
  }

  private _unwireReplayOnButtonSubtree() {
    if (!this._buttonWinner?.isValid) {
      return;
    }
    const visit = (n: Node) => {
      n.off(Node.EventType.TOUCH_END, this._reloadScene, this);
      n.off(Node.EventType.MOUSE_UP, this._reloadScene, this);
      const kids = n.children;
      for (let i = 0; i < kids.length; i++) {
        visit(kids[i]);
      }
    };
    visit(this._buttonWinner);
  }

  private _reloadScene() {
    const sc = director.getScene();
    if (!sc) {
      return;
    }
    director.loadScene(sc.name);
  }

  private _applyFontToLabel(lb: Label | null) {
    if (!lb || !this._fontResolved) {
      return;
    }
    lb.useSystemFont = false;
    lb.font = this._fontResolved;
  }

  private _refreshAllUiLabelsFont() {
    if (!this._winningScore?.isValid) {
      this._applyInstallLabelFontsOnly();
      return;
    }
    const pan = this._winningScore.parent;
    if (!pan?.isValid) {
      this._applyInstallLabelFontsOnly();
      return;
    }
    this._applyFontToLabel(this._findUnder(pan, 'VictoryLineCongrats')?.getComponent(Label) ?? null);
    this._applyFontToLabel(this._findUnder(pan, 'VictoryLineChoose')?.getComponent(Label) ?? null);
    this._applyInstallLabelFontsOnly();
  }

  private _applyInstallLabelFontsOnly() {
    if (!this._buttonWinner?.isValid) {
      return;
    }
    const labels = this._buttonWinner.getComponentsInChildren(Label);
    for (let i = 0; i < labels.length; i++) {
      this._applyFontToLabel(labels[i]);
    }
  }
}
