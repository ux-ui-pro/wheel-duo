interface WheelDuoOptions {
  rootSelector: string;
  firstWheelSelector: string;
  secondWheelSelector: string;
  triggerSelector: string;
  targetAngles: [number, number];
  rotations?: number;
  duration?: number;
  overshootDeg?: number;
  returnDuration?: number;
  swayOptions?: {
    amplitude?: number;
    period?: number;
  };
  callback?: () => void;
}

export default class WheelDuo {
  #rootElement!: HTMLElement;
  #firstWheel!: HTMLElement;
  #secondWheel!: HTMLElement;
  #triggerButton!: HTMLButtonElement;

  #swayAnimation: Animation | null = null;
  #swayingElement: HTMLElement | null = null;
  #finalRotation = new WeakMap<HTMLElement, number>();

  readonly #rotations: number;
  readonly #duration: number;
  readonly #overshootDeg: number;
  readonly #returnDuration: number;
  readonly #swayAmplitude: number;
  readonly #swayPeriod: number;
  readonly #rootClassName: string;

  #warmedUp = false;

  #onFirstClick: () => void = () => void this.#runPhaseOne();
  #onSecondClick: () => void = () => void this.#runPhaseTwo();

  constructor(private readonly options: Readonly<WheelDuoOptions>) {
    this.#rotations = options.rotations ?? 6;
    this.#duration = options.duration ?? 5000;
    this.#overshootDeg = options.overshootDeg ?? 15;
    this.#returnDuration = options.returnDuration ?? 750;
    this.#swayAmplitude = options.swayOptions?.amplitude ?? 6;
    this.#swayPeriod = options.swayOptions?.period ?? 1500;

    const sel = options.rootSelector.trim();

    this.#rootClassName = sel.startsWith('.') ? sel.slice(1) : sel;
  }

  init(): void {
    const root = document.querySelector<HTMLElement>(this.options.rootSelector);
    const first = root?.querySelector<HTMLElement>(this.options.firstWheelSelector);
    const second = root?.querySelector<HTMLElement>(this.options.secondWheelSelector);
    const trigger = root?.querySelector<HTMLButtonElement>(this.options.triggerSelector);

    if (!root || !first || !second || !trigger) return;

    this.#rootElement = root;
    this.#firstWheel = first;
    this.#secondWheel = second;
    this.#triggerButton = trigger;

    this.#warmUp(this.#firstWheel);
    this.#warmUp(this.#secondWheel);
    this.#startSway(this.#firstWheel);

    this.#triggerButton.addEventListener('click', this.#onFirstClick);
  }

  destroy(): void {
    this.#stopSway();
    this.#cancelAnimations(this.#firstWheel);
    this.#cancelAnimations(this.#secondWheel);
    this.#triggerButton.removeEventListener('click', this.#onFirstClick);
    this.#triggerButton.removeEventListener('click', this.#onSecondClick);
    this.#finalRotation = new WeakMap();
  }

  reset(): void {
    this.destroy();

    this.#firstWheel.style.transform = '';
    this.#secondWheel.style.transform = '';

    const cls = this.#rootClassName;

    this.#rootElement.classList.remove(
      `${cls}--state-one-active`,
      `${cls}--state-one-complete`,
      `${cls}--state-two-active`,
      `${cls}--state-two-complete`,
    );

    this.#warmedUp = false;

    this.init();
  }

  #warmUp(el: HTMLElement): void {
    if (this.#warmedUp) return;

    const warm = el.animate(
      [{ filter: 'blur(0)' }, { filter: 'blur(0.4px)', offset: 0.5 }, { filter: 'blur(0)' }],
      { duration: 64, fill: 'forwards' },
    );

    el.getBoundingClientRect();

    warm.onfinish = (): void => {
      warm.commitStyles?.();
      warm.cancel();
    };

    el.querySelectorAll('img').forEach((img) => {
      img.decode?.().catch(() => {});
    });

    this.#warmedUp = true;
  }

  async #runPhaseOne(): Promise<void> {
    const [a1] = this.options.targetAngles;
    const cls = this.#rootClassName;

    this.#rootElement.classList.add(`${cls}--state-one-active`);
    this.#stopSway();

    await this.#rotateWheelTo(this.#firstWheel, a1);

    this.#rootElement.classList.replace(`${cls}--state-one-active`, `${cls}--state-one-complete`);
    this.#startSway(this.#secondWheel);

    this.#triggerButton.removeEventListener('click', this.#onFirstClick);
    this.#triggerButton.addEventListener('click', this.#onSecondClick, { once: true });
  }

  async #runPhaseTwo(): Promise<void> {
    const [, a2] = this.options.targetAngles;
    const cls = this.#rootClassName;

    this.#rootElement.classList.add(`${cls}--state-two-active`);
    this.#stopSway();

    await this.#rotateWheelTo(this.#secondWheel, a2);

    this.#rootElement.classList.replace(`${cls}--state-two-active`, `${cls}--state-two-complete`);
    this.options.callback?.();
  }

  async #rotateWheelTo(el: HTMLElement, finalDeg: number): Promise<void> {
    const current = this.#getCurrentRotation(el);
    const diffCW = (this.#normalize(finalDeg) - this.#normalize(current) + 360) % 360;
    const target = current + this.#rotations * 360 + diffCW;
    const overs = target + this.#overshootDeg;
    const total = this.#duration + this.#returnDuration;
    const at = this.#duration / total;

    const spin = el.animate(
      [
        { transform: `rotate(${current}deg)`, easing: 'cubic-bezier(0.86,0,0.07,1)' },
        { offset: at, transform: `rotate(${overs}deg)`, easing: 'cubic-bezier(0.77,0,0.175,1)' },
        { transform: `rotate(${target}deg)` },
      ],
      { duration: total, fill: 'forwards' },
    );

    const blur = el.animate(
      [
        { filter: 'blur(0)' },
        { offset: 0.2, filter: 'blur(1px)' },
        { offset: 0.4, filter: 'blur(2px)' },
        { offset: 0.65, filter: 'blur(1px)' },
        { offset: 1, filter: 'blur(0)' },
      ],
      { duration: total, fill: 'forwards', easing: 'ease-in-out' },
    );

    await Promise.all([spin.finished, blur.finished]);

    this.#finalRotation.set(el, this.#normalize(target));
  }

  #startSway(el: HTMLElement): void {
    this.#stopSway();
    this.#swayingElement = el;

    const base = this.#finalRotation.get(el) ?? this.#getCurrentRotation(el);

    this.#swayAnimation = el.animate(
      [
        { transform: `rotate(${base - this.#swayAmplitude}deg)` },
        { transform: `rotate(${base + this.#swayAmplitude}deg)` },
      ],
      {
        duration: this.#swayPeriod,
        direction: 'alternate',
        iterations: Infinity,
        easing: 'ease-in-out',
        delay: -this.#swayPeriod / 2,
      },
    );
  }

  #stopSway(): void {
    if (!this.#swayAnimation || !this.#swayingElement) return;

    const el = this.#swayingElement;
    const snap = getComputedStyle(el).transform;

    this.#swayAnimation.commitStyles?.();
    this.#swayAnimation.cancel();

    el.style.transform = snap !== 'none' ? snap : '';

    this.#swayAnimation = null;
    this.#swayingElement = null;
  }

  #normalize(deg: number): number {
    return ((deg % 360) + 360) % 360;
  }

  #getCurrentRotation(el: HTMLElement): number {
    const t = getComputedStyle(el).transform;
    if (!t || t === 'none') return 0;
    const { a, b } = new DOMMatrixReadOnly(t);
    return (Math.atan2(b, a) * 180) / Math.PI;
  }

  #cancelAnimations(el: HTMLElement): void {
    el.getAnimations().forEach((a) => a.cancel());
  }
}
