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
  #finalRotation: WeakMap<HTMLElement, number> = new WeakMap();

  readonly #rotations: number;
  readonly #duration: number;
  readonly #overshootDeg: number;
  readonly #returnDuration: number;
  readonly #swayAmplitude: number;
  readonly #swayPeriod: number;

  readonly #rootClassName: string;

  #warmedUp: WeakSet<HTMLElement> = new WeakSet();
  #willChangeActive = false;
  #willChangeElement: HTMLElement | null = null;

  #onFirstClick: (e: MouseEvent) => void = () => {
    void this.#runPhaseOne();
  };

  #onSecondClick: (e: MouseEvent) => void = () => {
    void this.#runPhaseTwo();
  };

  constructor(private readonly options: Readonly<WheelDuoOptions>) {
    this.#rotations = options.rotations ?? 6;
    this.#duration = options.duration ?? 5000;
    this.#overshootDeg = options.overshootDeg ?? 15;
    this.#returnDuration = options.returnDuration ?? 750;
    this.#swayAmplitude = options.swayOptions?.amplitude ?? 6;
    this.#swayPeriod = options.swayOptions?.period ?? 1500;

    const selector = options.rootSelector.trim();

    this.#rootClassName = selector.startsWith('.') ? selector.slice(1) : selector;
  }

  init(): void {
    const root = document.querySelector<HTMLElement>(this.options.rootSelector);

    if (!root) return;

    const first = root.querySelector<HTMLElement>(this.options.firstWheelSelector);
    const second = root.querySelector<HTMLElement>(this.options.secondWheelSelector);
    const trigger = root.querySelector<HTMLButtonElement>(this.options.triggerSelector);

    if (!first || !second || !trigger) return;

    this.#rootElement = root;
    this.#firstWheel = first;
    this.#secondWheel = second;
    this.#triggerButton = trigger;

    this.#warmUp(this.#firstWheel);
    this.#warmUp(this.#secondWheel);

    this.#triggerButton.addEventListener('click', this.#onFirstClick);

    this.#startSway(this.#firstWheel);
  }

  destroy(): void {
    this.#stopSway();
    this.#cancelAnimations(this.#firstWheel);
    this.#cancelAnimations(this.#secondWheel);

    this.#triggerButton?.removeEventListener('click', this.#onFirstClick);
    this.#triggerButton?.removeEventListener('click', this.#onSecondClick);

    this.#finalRotation = new WeakMap();

    this.#disableWillChange();
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

    this.#triggerButton.addEventListener('click', this.#onFirstClick);

    this.#startSway(this.#firstWheel);
  }

  #warmUp(el: HTMLElement): void {
    if (this.#warmedUp.has(el)) return;

    const warm = el.animate(
      [
        {
          transform: 'rotate(0deg)',
          filter: 'blur(0px)',
        },
        {
          transform: 'rotate(0.01deg)',
          filter: 'blur(2px)',
        },
      ],
      { duration: 1 },
    );

    warm.cancel();

    this.#warmedUp.add(el);
  }

  #enableWillChange(el: HTMLElement): void {
    if (this.#willChangeActive) return;

    el.style.willChange = 'transform, filter';

    this.#willChangeActive = true;
    this.#willChangeElement = el;
  }

  #disableWillChange(): void {
    if (!this.#willChangeActive || !this.#willChangeElement) return;

    this.#willChangeElement.style.willChange = 'auto';
    this.#willChangeElement = null;
    this.#willChangeActive = false;
  }

  async #rotateWheelTo(el: HTMLElement, finalDeg: number): Promise<void> {
    this.#enableWillChange(el);

    const currentDeg = this.#getCurrentRotation(el);
    const diffCW = (this.#normalize(finalDeg) - this.#normalize(currentDeg) + 360) % 360;
    const targetDeg = currentDeg + this.#rotations * 360 + diffCW;
    const overshootDeg = targetDeg + this.#overshootDeg;
    const total = this.#duration + this.#returnDuration;
    const overshootAt = this.#duration / total;

    const spin = el.animate(
      [
        {
          transform: `rotate(${currentDeg}deg)`,
          easing: 'cubic-bezier(0.86,0,0.07,1)',
        },
        {
          offset: overshootAt,
          transform: `rotate(${overshootDeg}deg)`,
          easing: 'cubic-bezier(0.77,0,0.175,1)',
        },
        { transform: `rotate(${targetDeg}deg)` },
      ],
      {
        duration: total,
        fill: 'forwards',
      },
    );

    const blur = el.animate(
      [
        { filter: 'blur(0)' },
        { offset: 0.2, filter: 'blur(1px)' },
        { offset: 0.4, filter: 'blur(2px)' },
        { offset: 0.65, filter: 'blur(1px)' },
        { offset: 1, filter: 'blur(0)' },
      ],
      {
        duration: total,
        fill: 'forwards',
        easing: 'ease-in-out',
      },
    );

    await Promise.all([spin.finished, blur.finished]);

    this.#finalRotation.set(el, this.#normalize(targetDeg));

    this.#disableWillChange();
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
    const snapshot = getComputedStyle(el).transform;

    this.#swayAnimation.commitStyles?.();
    this.#swayAnimation.cancel();

    el.style.transform = snapshot !== 'none' ? snapshot : '';

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

  async #runPhaseOne(): Promise<void> {
    const [firstAngle] = this.options.targetAngles;

    this.#rootElement.classList.add(`${this.#rootClassName}--state-one-active`);
    this.#stopSway();

    await this.#rotateWheelTo(this.#firstWheel, firstAngle);

    this.#rootElement.classList.remove(`${this.#rootClassName}--state-one-active`);
    this.#rootElement.classList.add(`${this.#rootClassName}--state-one-complete`);

    this.#startSway(this.#secondWheel);

    this.#triggerButton.removeEventListener('click', this.#onFirstClick);
    this.#triggerButton.addEventListener('click', this.#onSecondClick, { once: true });
  }

  async #runPhaseTwo(): Promise<void> {
    const [, secondAngle] = this.options.targetAngles;

    this.#rootElement.classList.add(`${this.#rootClassName}--state-two-active`);
    this.#stopSway();

    await this.#rotateWheelTo(this.#secondWheel, secondAngle);

    this.#rootElement.classList.remove(`${this.#rootClassName}--state-two-active`);
    this.#rootElement.classList.add(`${this.#rootClassName}--state-two-complete`);

    this.options.callback?.();
  }
}
