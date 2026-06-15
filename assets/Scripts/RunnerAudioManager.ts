import { _decorator, AudioClip, AudioSource, Component } from 'cc';

const { ccclass, property } = _decorator;

@ccclass('RunnerAudioManager')
export class RunnerAudioManager extends Component {
  private static _inst: RunnerAudioManager | null = null;

  public static get inst(): RunnerAudioManager | null {
    return RunnerAudioManager._inst;
  }

  @property({ type: AudioSource })
  public musicSource: AudioSource | null = null;

  @property({ type: AudioSource })
  public sfxSource: AudioSource | null = null;

  @property({ type: AudioClip })
  public music: AudioClip | null = null;

  @property({ type: AudioClip })
  public jump: AudioClip | null = null;

  @property({ type: AudioClip })
  public hit: AudioClip | null = null;

  @property({ type: AudioClip })
  public hurt: AudioClip | null = null;

  @property({ type: AudioClip })
  public collect: AudioClip | null = null;

  @property({ type: AudioClip })
  public step: AudioClip | null = null;

  @property({ type: AudioClip })
  public win: AudioClip | null = null;

  @property({ type: AudioClip })
  public lose: AudioClip | null = null;

  @property
  public musicVolume = 0.3;

  @property
  public jumpVolume = 0.5;

  @property
  public hitVolume = 0.6;

  @property
  public hurtVolume = 0.7;

  @property
  public collectVolume = 0.4;

  @property
  public stepVolume = 0.3;

  @property
  public winVolume = 0.8;

  @property
  public loseVolume = 0.8;

  @property
  public stepInterval = 0.38;

  private _unlocked = false;

  private _musicPlaying = false;

  private _running = false;

  private _stepAcc = 0;

  onLoad() {
    RunnerAudioManager._inst = this;
    this._resolveSources();
  }

  onDestroy() {
    if (RunnerAudioManager._inst === this) {
      RunnerAudioManager._inst = null;
    }
  }

  update(dt: number) {
    if (!this._unlocked || !this._running) {
      return;
    }
    this._stepAcc += dt;
    if (this._stepAcc < this.stepInterval) {
      return;
    }
    this._stepAcc = 0;
    this.playStep();
  }

  public unlockOnFirstTap() {
    if (this._unlocked) {
      return;
    }
    this._unlocked = true;
    this.playMusic();
  }

  public setRunning(value: boolean) {
    this._running = value;
    if (!value) {
      this._stepAcc = 0;
    }
  }

  public playMusic() {
    const src = this.musicSource;
    if (!src?.isValid || !this.music || this._musicPlaying) {
      return;
    }
    src.stop();
    src.clip = this.music;
    src.loop = true;
    src.volume = this.musicVolume;
    src.play();
    this._musicPlaying = true;
  }

  public stopMusic() {
    const src = this.musicSource;
    if (!src?.isValid) {
      return;
    }
    src.stop();
    this._musicPlaying = false;
  }

  public playJump() {
    this._playSfx(this.jump, this.jumpVolume);
  }

  public playHit() {
    this._playSfx(this.hit, this.hitVolume);
  }

  public playHurt() {
    this._playSfx(this.hurt, this.hurtVolume);
  }

  public playCollect() {
    this._playSfx(this.collect, this.collectVolume);
  }

  public playStep() {
    this._playSfx(this.step, this.stepVolume);
  }

  public playWin() {
    this.stopMusic();
    this.setRunning(false);
    this._playSfx(this.win, this.winVolume);
  }

  public playLose() {
    this.stopMusic();
    this.setRunning(false);
    this._playSfx(this.lose, this.loseVolume);
  }

  private _resolveSources() {
    const list = this.node.getComponents(AudioSource);
    if (!this.musicSource && list.length > 0) {
      this.musicSource = list[0];
    }
    if (!this.sfxSource && list.length > 1) {
      this.sfxSource = list[1];
    }
  }

  private _playSfx(clip: AudioClip | null, volume: number) {
    const src = this.sfxSource;
    if (!src?.isValid || !clip) {
      return;
    }
    src.playOneShot(clip, Math.max(0, volume));
  }
}
