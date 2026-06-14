import {
  _decorator,
  Component,
  Node,
  Label,
  Color,
  Font,
  assetManager,
  UITransform,
} from 'cc';

const { ccclass, property } = _decorator;

const DEFAULT_UI_FONT_UUID = 'f0fa0c07-ae6d-4f7a-a34c-db6bf5058482';

@ccclass('RunnerBalanceScore')
export class RunnerBalanceScore extends Component {
  @property({ type: Font })
  public uiFont: Font | null = null;

  @property({ type: Label })
  public amountLabel: Label | null = null;

  @property
  public autoCreateLabel = true;

  @property
  public fontSize = 34;

  @property
  public textColor: Color = new Color(25, 55, 130, 255);

  @property
  public labelLocalX = 82;

  @property
  public labelWidth = 220;

  @property
  public labelHeight = 56;

  @property({ type: Node })
  public winningScoreNode: Node | null = null;

  @property({ type: Label })
  public victoryAmountLabel: Label | null = null;

  @property
  public autoCreateVictoryLabel = true;

  @property
  public victoryFontSize = 52;

  @property
  public victoryLabelLocalX = 0;

  @property
  public victoryLabelLocalY = 0;

  @property
  public victoryLabelWidth = 360;

  @property
  public victoryLabelHeight = 80;

  @property
  public victoryCountUpMaxSeconds = 3.5;

  private _score = 0;

  private _fontResolved: Font | null = null;

  private _victoryLabel: Label | null = null;

  private _victoryCountFn: (() => void) | null = null;

  onLoad() {
    if (this.uiFont) {
      this._fontResolved = this.uiFont;
    } else {
      assetManager.loadAny({ uuid: DEFAULT_UI_FONT_UUID }, (err, asset) => {
        if (!err && asset) {
          this._fontResolved = asset as Font;
        }
        this._applyFontToAmount();
        this._applyFontToVictory();
      });
    }
  }

  start() {
    this.scheduleOnce(() => {
      if (!this._fontResolved && this.uiFont) {
        this._fontResolved = this.uiFont;
      }
      this._resolveWinningScoreNode();
      this._ensureVictoryLabel();
      this._ensureLabel();
      this.reset();
      this._applyFontToAmount();
      this._applyFontToVictory();
    }, 0);
  }

  onDestroy() {
    this._stopVictoryCountUp();
  }

  public reset() {
    this._score = 0;
    this._refreshString();
  }

  public addPoints(delta: number) {
    if (delta <= 0) {
      return;
    }
    this._score += delta;
    this._refreshString();
  }

  public get score(): number {
    return this._score;
  }

  public revealVictoryScore() {
    this._resolveWinningScoreNode();
    this._ensureVictoryLabel();
    const lb = this._victoryLabel;
    if (!lb?.isValid) {
      return;
    }
    this._stopVictoryCountUp();
    lb.string = '$0';
    lb.node.active = true;
    this._applyFontToVictory();
    const target = this._score;
    if (target <= 0) {
      return;
    }
    const tickInc = 30;
    let shown = 0;
    const interval = this._countUpIntervalFor(target, tickInc);
    this._victoryCountFn = () => {
      if (!lb.isValid) {
        this._stopVictoryCountUp();
        return;
      }
      shown = Math.min(shown + tickInc, target);
      if (shown >= target) {
        lb.string = '$' + target;
        this._stopVictoryCountUp();
        return;
      }
      lb.string = '$' + shown;
    };
    this.schedule(this._victoryCountFn, interval);
  }

  private _stopVictoryCountUp() {
    if (this._victoryCountFn) {
      this.unschedule(this._victoryCountFn);
      this._victoryCountFn = null;
    }
  }

  private _countUpIntervalFor(target: number, tickInc: number): number {
    if (target <= 0) {
      return 0.05;
    }
    const maxSec = Math.max(0.05, this.victoryCountUpMaxSeconds);
    const steps = Math.ceil(target / Math.max(1, tickInc));
    return Math.max(0.008, maxSec / Math.max(1, steps));
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

  private _resolveWinningScoreNode() {
    if (this.winningScoreNode?.isValid) {
      return;
    }
    const sc = this.node.scene;
    if (!sc) {
      return;
    }
    this.winningScoreNode = this._findChildByNameCi(sc, 'WinningScore');
  }

  private _ensureVictoryLabel() {
    if (this.victoryAmountLabel?.isValid) {
      this._victoryLabel = this.victoryAmountLabel;
      this._styleVictoryLabel(this._victoryLabel);
      this._victoryLabel.node.active = false;
      return;
    }
    const root = this.winningScoreNode;
    if (!root?.isValid) {
      return;
    }
    let n = root.getChildByName('VictoryMoneyScore');
    if (n?.isValid) {
      const lb = n.getComponent(Label);
      if (lb) {
        this._victoryLabel = lb;
        this._styleVictoryLabel(lb);
        lb.node.active = false;
        return;
      }
    }
    if (!this.autoCreateVictoryLabel) {
      return;
    }
    n = new Node('VictoryMoneyScore');
    n.layer = root.layer;
    const tf = n.addComponent(UITransform);
    tf.setContentSize(this.victoryLabelWidth, this.victoryLabelHeight);
    tf.anchorX = 0.5;
    tf.anchorY = 0.5;
    n.setPosition(this.victoryLabelLocalX, this.victoryLabelLocalY, 0);
    const lb = n.addComponent(Label);
    this._styleVictoryLabel(lb);
    root.addChild(n);
    n.setSiblingIndex(root.children.length - 1);
    lb.node.active = false;
    this._victoryLabel = lb;
  }

  private _styleVictoryLabel(lb: Label) {
    lb.fontSize = this.victoryFontSize;
    lb.lineHeight = this.victoryFontSize + 6;
    lb.color = this.textColor;
    lb.horizontalAlign = Label.HorizontalAlign.CENTER;
    lb.verticalAlign = Label.VerticalAlign.CENTER;
    lb.overflow = Label.Overflow.NONE;
    lb.cacheMode = Label.CacheMode.BITMAP;
  }

  private _applyFontToVictory() {
    const lb = this._victoryLabel;
    if (!lb?.isValid) {
      return;
    }
    const f = this._fontResolved || this.uiFont;
    if (f) {
      lb.useSystemFont = false;
      lb.font = f;
    } else {
      lb.useSystemFont = true;
    }
  }

  private _ensureLabel() {
    if (this.amountLabel?.isValid) {
      this._styleLabel(this.amountLabel);
      return;
    }
    const existing = this.node.getChildByName('MoneyScoreText');
    if (existing?.isValid) {
      const lb = existing.getComponent(Label);
      if (lb) {
        this.amountLabel = lb;
        this._styleLabel(lb);
        return;
      }
    }
    if (!this.autoCreateLabel) {
      return;
    }
    const n = new Node('MoneyScoreText');
    n.layer = this.node.layer;
    const tf = n.addComponent(UITransform);
    tf.setContentSize(this.labelWidth, this.labelHeight);
    tf.anchorX = 1;
    tf.anchorY = 0.5;
    n.setPosition(this.labelLocalX, 0, 0);
    const lb = n.addComponent(Label);
    this._styleLabel(lb);
    this.node.addChild(n);
    n.setSiblingIndex(this.node.children.length - 1);
    this.amountLabel = lb;
  }

  private _styleLabel(lb: Label) {
    lb.fontSize = this.fontSize;
    lb.lineHeight = this.fontSize + 4;
    lb.color = this.textColor;
    lb.horizontalAlign = Label.HorizontalAlign.RIGHT;
    lb.verticalAlign = Label.VerticalAlign.CENTER;
    lb.overflow = Label.Overflow.NONE;
    lb.cacheMode = Label.CacheMode.BITMAP;
  }

  private _refreshString() {
    const lb = this.amountLabel;
    if (!lb?.isValid) {
      return;
    }
    lb.string = '$' + this._score;
  }

  private _applyFontToAmount() {
    const lb = this.amountLabel;
    if (!lb?.isValid) {
      return;
    }
    const f = this._fontResolved || this.uiFont;
    if (f) {
      lb.useSystemFont = false;
      lb.font = f;
    } else {
      lb.useSystemFont = true;
    }
  }
}
