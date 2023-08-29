import { filter } from "rxjs";
import Compass from "../compass/compass";
import { Answer, Collect, LifeCycle } from "../stream/stream";
import { BigNumber } from "mathjs";
import Motion from "../motion/motion";
import { mathjs } from "../lib/math";
import { Equation } from "../lib/equation";
let { bignumber } = mathjs

export default class Direction {

    env: Environment;

    angle: BigNumber;

    time: number;

    E_est: BigNumber = bignumber(0); // 估计误差

    step: number = 100;

    count: {
        quick: number;
        slow: number
    } = {
            quick: 0,
            slow: 0
        };

    state: 'quick' | 'slow';

    set compass({ angle, E_mea, time }: Compass) {
        if (this.angle && time - this.time > this.step) {
            let { value, error } = Equation.simpleKalman(this.angle, angle, this.E_est, E_mea)
            this.angle = value
            this.E_est = error
        } else {
            this.angle = angle
            this.E_est = E_mea
        }
        if (time > this.time) {
            Answer.next({
                event: 'direction',
                success: true,
                duration: time - this.time,
                value: this.angle
            })
        }
        this.time = time
    }

    set motion({ angle, E_mea, time }: Motion) {
        if (this.angle && time - this.time > this.step) {
            let { value, error } = Equation.simpleKalman(this.angle, angle, this.E_est, E_mea)
            this.angle = value
            this.E_est = error
        } else {
            this.angle = angle
            this.E_est = E_mea
        }
        if (time > this.time) {
            Answer.next({
                event: 'direction',
                success: true,
                duration: time - this.time,
                value: this.angle
            })
        }
        this.time = time
    }

    subscribe() {
        LifeCycle.asObservable().pipe(
            filter(({ event }) => event == 'init')
        ).subscribe(data => {
            this.env = (data as InitMessage).env
        })

        Collect.asObservable().pipe(
            filter(({ success }) => success)
        ).subscribe(({ origin, value, time }) => {
            switch (origin) {
                case 'compass':
                    this.compass = new Compass(value as CompassData, this.env, time)
                    break;
                case 'motion':
                    this.motion = new Motion(value, this.env, time)
                    break;
            }
        })
    }
}
