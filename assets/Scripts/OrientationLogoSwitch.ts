import {
  _decorator,
  Component,
  Node,
  director,
  view,
} from 'cc';

const { ccclass, property } = _decorator;

@ccclass('OrientationLogoSwitch')
export class OrientationLogoSwitch extends Component {
  @property({ type: Node })
  public portraitLogo: Node | null = null;

  @property({ type: Node })
  public landscapeLogo: Node | null = null;

  onLoad() {
    this._resolveNodes();
    view.on('canvas-resize', this._apply, this);
    view.on('design-resolution-changed', this._apply, this);
    this.scheduleOnce(() => this._apply(), 0);
  }

  start() {
    this._apply();
  }

  onDestroy() {
    view.off('canvas-resize', this._apply, this);
    view.off('design-resolution-changed', this._apply, this);
  }

  public hideAll() {
    this._setActive(this.portraitLogo, false);
    this._setActive(this.landscapeLogo, false);
  }

  private _resolveNodes() {
    const scene = director.getScene();
    if (!scene) {
      return;
    }
    if (!this.portraitLogo) {
      this.portraitLogo = this._findByName(scene, 'Logo');
    }
    if (!this.landscapeLogo) {
      this.landscapeLogo =
        this._findByName(scene, 'logo2') ?? this._findByName(scene, 'Logo2');
    }
  }

  private _apply() {
    this._resolveNodes();
    const size = view.getVisibleSize();
    const landscape = size.width > size.height;
    this._setActive(this.portraitLogo, !landscape);
    this._setActive(this.landscapeLogo, landscape);
  }

  private _setActive(n: Node | null, value: boolean) {
    if (n?.isValid) {
      n.active = value;
    }
  }

  private _findByName(root: Node, name: string): Node | null {
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
    const roots = root.children;
    for (let i = 0; i < roots.length; i++) {
      const r = visit(roots[i]);
      if (r) {
        return r;
      }
    }
    return null;
  }
}
