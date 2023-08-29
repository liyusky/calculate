import { filter } from "rxjs"
import { Answer, Collect, LifeCycle } from "../stream/stream"
import GPS from "../gps/gps";
import { Matrix } from "mathjs";
import { Equation } from "../lib/equation";
import { Point } from "../lib/point";
import AOA from "../aoa/aoa";
import BLE from "../ble/ble";

export default class Location {

    account: Account;

    point: Point;

    covariance: Matrix;

    line: Line;

    step = 100;

    time: number;

    set gps({ point, time }: GPS) {
        if (this.point && Math.abs(time - this.time) < this.step && Equation.inWide(point, this.point, 10)) {
            let result = Equation.fusionPoint(false, point, this.point)
            this.point = result.point
            this.covariance = result.covariance
        } else {
            this.point = point
            this.covariance = point.covariance
        }
        if (this.time < time) {
            Answer.next({
                event: 'location-measure',
                success: true,
                time,
                value: this.point
            })
        }
        this.time = time
    }

    set ble({ point, time }: BLE) {
        if (this.point && Math.abs(time - this.time) < this.step && Equation.inWide(point, this.point, 10)) {
            let result = Equation.fusionPoint(false, point, this.point)
            this.point = result.point
            this.covariance = result.covariance
        } else {
            this.point = point
            this.covariance = point.covariance
        }
        if (this.time < time) {
            Answer.next({
                event: 'location-measure',
                success: true,
                time,
                value: this.point
            })
        }
        this.time = time
    }

    set aoa({ point, time }: AOA) {
        if (this.point && Math.abs(time - this.time) < this.step && Equation.inWide(point, this.point, 10)) {
            let result = Equation.fusionPoint(false, point, this.point)
            this.point = result.point
            this.covariance = result.covariance
        } else {
            this.point = point
            this.covariance = point.covariance
        }
        if (this.time < time) {
            Answer.next({
                event: 'location-measure',
                success: true,
                time,
                value: this.point
            })
        }
        this.time = time
    }

    subscribe() {
        LifeCycle.asObservable().pipe(
            filter(({ event }) => event == 'init')
        ).subscribe(data => {
            this.account = (data as InitMessage).value
        })

        Collect.asObservable().pipe(
            filter(({ success }) => success)
        ).subscribe(data => {
            switch (data.origin) {
                case 'gps':
                    this.gps = new GPS(data, this.account)
                    break;
                case 'ble':
                    this.ble = new BLE(data)
                    break;
                case 'aoa':
                    this.aoa = new AOA(data)
                    break;
            }
        })
    }
}