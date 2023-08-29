import Kalman from "../kalman/kalman";
import { Matrix } from "mathjs";
import { Point } from "../lib/point";

type PreciseLength = 5 | 6 | 7 | 8 | 9;

type PrecisionRange = 1 | 2 | 3 | 4 | 5 | 6 | 7;

type ScheduledTime = {
    ordinary: number;
    calculate: number;
    measurement: number;
    special: {
        5: number;
        6: number;
        7: number;
        8: number;
        9: number;
    }
}

class Scheduled {

    length: number = -1;

    precision: PrecisionRange = 6; // 算法准确度

    time: ScheduledTime = {
        ordinary: 0, // 非特殊数据量的计算时间
        calculate: 0, // 计算时间
        measurement: 0, // 测量时间
        special: {
            5: 0,
            6: 0,
            7: 0,
            8: 0,
            9: 0,
        } // 特殊数据量的计算时间
    };

    allocation(time: number, length: number, callback: Function) {
        if (length > 4 && length < 10) {
            if (length < this.length) {
                this.precision = 7
                if (this.length < 10 && this.length > 4) {
                    this.time.calculate = this.time.special[this.length as PreciseLength]
                } else {
                    this.time.calculate = this.time.ordinary
                }
            }
            else this.time.calculate = this.time.special[length as PreciseLength]
        } else {
            this.time.calculate = this.time.ordinary
        }

        if (time - this.time.measurement < this.time.calculate) {
            this.precision--
            if (this.precision < 1) this.precision = 1
        } else {
            this.precision++
            if (this.precision > 7) this.precision = 7
        }

        this.length = length
        this.time.measurement = time

        let startTime: number = Date.now()
        callback();
        let endTime: number = Date.now()

        if (length > 4 && length < 10) {
            this.time.special[length as PreciseLength] = endTime - startTime
        } else {
            this.time.ordinary = endTime - startTime
        }
    }
}

const scheduled = new Scheduled()

export default class BLE {

    point: Point;

    time: number;

    E_mea: Matrix;

    constructor({ value, time }: BleMessage) {
        scheduled.allocation(time, value.length, () => {
            this.point = new Kalman(value, time).collect().filter(scheduled.precision as PrecisionRange)
        })
        this.time = time
    }
}