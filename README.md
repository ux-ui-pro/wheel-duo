<div align="center">
<br>

<h1>wheel-duo</h1>

<p><sup>Animated dual-wheel component with customizable spin, sway, and callback support</sup></p>

[![npm](https://img.shields.io/npm/v/wheel-duo.svg?colorB=brightgreen)](https://www.npmjs.com/package/wheel-duo)
[![GitHub package version](https://img.shields.io/github/package-json/v/ux-ui-pro/wheel-duo.svg)](https://github.com/ux-ui-pro/wheel-duo)
[![NPM Downloads](https://img.shields.io/npm/dm/wheel-duo.svg?style=flat)](https://www.npmjs.org/package/wheel-duo)

<sup>2kB gzipped</sup>

<a href="https://codepen.io/ux-ui/pen/jEEzBed">Demo</a>

</div>
<br>

&#10148; **Install**
```console
$ yarn add wheel-duo
```
<br>

&#10148; **Import**
```javascript
import WheelDuo from 'wheel-duo';
```
<br>

&#10148; **Usage**
```javascript
const wheelDuo = new WheelDuo({
  rootSelector: '.wheel-container',
  firstWheelSelector: '.wheel-segments-one',
  secondWheelSelector: '.wheel-segments-two',
  triggerSelector: '.wheel-trigger',
  targetAngles: [180, 270],
  callback: () => console.log('Spin complete'),
});

wheelDuo.init();
```
<br>

&#10148; **Options**

| Option                |                   Type                    | Default | Description                                                   |
|:----------------------|:-----------------------------------------:|:-------:|:--------------------------------------------------------------|
| `rootSelector`        |                 `string`                  |   `–`   | Root container element selector.                              |
| `firstWheelSelector`  |                 `string`                  |   `–`   | Selector for the first (top) wheel.                           |
| `secondWheelSelector` |                 `string`                  |   `–`   | Selector for the second (bottom) wheel.                       |
| `triggerSelector`     |                 `string`                  |   `–`   | Selector for the trigger button that initiates spinning.      |
| `targetAngles`        |            `[number, number]`             |   `–`   | Final rotation angles (degrees) for each wheel.               |
| `rotations`           |                 `number`                  |   `6`   | Full 360° rotations before reaching target angle.             |
| `duration`            |                 `number`                  | `5000`  | Duration of the spin animation (ms).                          |
| `overshootDeg`        |                 `number`                  |  `15`   | Overshoot in degrees before snapping back to the final angle. |
| `returnDuration`      |                 `number`                  |  `750`  | Duration of the overshoot return animation (ms).              |
| `swayOptions`         | `{ amplitude?: number; period?: number }` |   `–`   | Optional sway animation while idle.                           |
| `callback`            |               `() => void`                |   `–`   | Called when both spin phases complete.                        |
<br>

&#10148; **API**

| Method      | Description                                                               |
|:------------|:--------------------------------------------------------------------------|
| `init()`    | Initializes DOM references, sets up events and starts the sway animation. |
| `destroy()` | Cleans up animations and event listeners.                                 |
| `reset()`   | Resets state, styles, and restarts idle animation.                        |
<br>

&#10148; **States & Styling**

WheelDuo dynamically applies state-based CSS classes to the root element:

- `--state-one-active`
- `--state-one-complete`
- `--state-two-active`
- `--state-two-complete`

Use these to animate UI elements or indicate progression in your styles.
<br><br>

&#10148; **License**

wheel-duo is released under the MIT license.
