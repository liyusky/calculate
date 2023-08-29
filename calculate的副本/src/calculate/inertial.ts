import { filter } from "rxjs";
import { Answer, Collect } from "../stream/stream";
import Accelerometer from "../accelerometer/accelerometer";
import { Point } from "../lib/point";
import { mathjs } from "../lib/math";
import { Equation } from "../lib/equation";
import { Matrix, i } from "mathjs";
let { add } = mathjs

export default class Inertial {

    points: Array<Point> = [];

    acceleration: Array<Accelerometer> = [];

    velocity: Matrix;

    displacement: Matrix;

    hinder: boolean = false;

    sum: SummationInitialValue = Equation.createSummationInitialValue();

    error: Matrix[];

    public set location(point: Point) {
        this.points.push(point)
        this.guess()
    }

    public set tendency(acceleration: Accelerometer) {
        this.acceleration.push(acceleration)
        this.guess()
    }

    public get allow(): boolean {
        let pointsLength = this.points.length,
            accelerationLength = this.acceleration.length;
        let firstPoint = this.points[0],
            lastPoint = this.points[pointsLength - 1],
            firstAcceleration = this.acceleration[0],
            lastAcceleration = this.acceleration[accelerationLength - 1];
        if (pointsLength && accelerationLength == 0) {
            console.log(this.points.splice(0, pointsLength));
            this.points.splice(0, pointsLength)
            return false
        } else if (pointsLength == 0 && accelerationLength) {
            this.acceleration.splice(0, accelerationLength - 1)
            return false
        } else if (!this.velocity && (pointsLength < 2 || accelerationLength < 2)) {
            return false
        } else if (this.velocity) {
            return true
        } else if (lastPoint.time.lt(firstAcceleration.time)) {
            this.points.splice(0, pointsLength)
            return false
        } else if (lastAcceleration.time.lt(firstPoint.time)) {
            this.acceleration.splice(0, accelerationLength - 1)
            return false
        }

        let secondPoint = this.points[1];
        return this.acceleration.some(item => item.time.gte(secondPoint.time))
    }

    guess() {
        if (!this.allow) return
        if (this.velocity) {
            this.guessDisplacement()
        } else {
            this.guessInitVelocity()
        }
    }

    guessInitVelocity() {
        let firstPoint = this.points[0], secondPoint = this.points[1];
        let firstIndex = Equation.findNearIndex(this.acceleration, item => item.time.lte(firstPoint.time)),
            secondIndex = this.acceleration.findIndex(item => item.time.gte(secondPoint.time));
        let list = this.acceleration.slice(firstIndex, secondIndex);
        list[0] = Equation.instantaneousAcceleration(this.acceleration[0], this.acceleration[1], this.points[0].time)
        list.push(Equation.instantaneousAcceleration(this.acceleration[secondIndex - 1], this.acceleration[secondIndex], this.points[1].time))

        let { velocity, error, displacement } = Equation.guessVelocity(list, firstPoint, secondPoint)

        this.velocity = velocity
        this.error = error as Matrix[]
        this.displacement = displacement
        this.points.shift()
        this.acceleration.splice(0, secondIndex, list.pop() as Accelerometer)
    }

    guessDisplacement() {
        if (this.hinder) return
        this.hinder = true
        let nextPoint = this.points[1];

        while (this.acceleration[1]) {
            if (!!nextPoint) {
                if (this.acceleration[1].time.gt(nextPoint.time)) {
                    this.acceleration.splice(1, 0, Equation.instantaneousAcceleration(this.acceleration[0], this.acceleration[1], nextPoint.time))
                }
            }
            Equation.integralSignAccelerationSummation(this.sum, this.acceleration[0], this.acceleration[1])

            let { displacement, velocity } = Equation.integralDisplacement(this.acceleration[0], this.acceleration[1], this.velocity)
            this.displacement = add(this.displacement, displacement)
            this.velocity = velocity


            if (!!nextPoint && this.acceleration[1].time.eq(nextPoint.time)) {
                let { velocity, error, displacement } = Equation.updateInertialError(this.sum, this.error, this.points[0], nextPoint)
                this.velocity = velocity
                this.error = error as Matrix[]
                this.displacement = displacement
                this.points.shift()
                this.sum = Equation.createSummationInitialValue()
                nextPoint = this.points[1]
            }
            this.acceleration.shift()
        }
        this.hinder = false
        if (this.acceleration[0].time.sub(this.points[0].time).gte(5000)) {
            Answer.next({
                event: 'location-inertial',
                success: true,
                time: this.acceleration[0].time.toNumber(),
                value: Point.createFormInertial(this.displacement, this.points[0], this.acceleration[0].time)
            })
            this.sum = Equation.createSummationInitialValue()
        }
    }

    subscribe() {
        Answer.asObservable().pipe(
            filter(({ event, success }) => event == 'location-measure' && success)
        ).subscribe((data) => {
            this.location = (data as LocationCalculateAnswerMessage).value
        })

        Collect.asObservable().pipe(
            filter(({ success, origin }) => success && origin == 'accelerometer')
        ).subscribe(({ value, time }) => {
            this.tendency = new Accelerometer(value as Acceleration, time)
        })
    }
}