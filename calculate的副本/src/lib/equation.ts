import { BigNumber, Matrix } from "mathjs"
import { Point } from "./point";
import { mathjs } from "./math";
import Accelerometer from "../accelerometer/accelerometer";
let { add, bignumber, multiply, divide, subtract, zeros, identity, matrix, sqrtm, transpose, pow } = mathjs


const n: number = 2;
const alpha: number = 0.1;
const kappa: number = 3 - n;
const lambda: number = Math.pow(alpha, 2) * (n + kappa) - n;
const weight_0 = lambda / (lambda + 2)
const weight_i = 1 / (2 * (n + lambda))

const offset1: Matrix = matrix([
    [1],
    [0],
])

const offset2: Matrix = matrix([
    [-1],
    [0],
])

const offset3: Matrix = matrix([
    [0],
    [1],
])

const offset4: Matrix = matrix([
    [0],
    [-1],
])



export class Equation {

    static absDiff(minuend: Point, subtrahend: Point) {
        return new Point({
            x: minuend.x.div(subtrahend.x).abs(),
            y: minuend.y.div(subtrahend.y).abs()
        })
    }

    static inWide(Z: Point, X: Point, limit: number) {
        return Z.x.div(X.x).pow(2).add(Z.y.div(X.y).pow(2)).lte(bignumber(limit).pow(2))
    }

    static findNearIndex<T>(list: T[], condition: (item: T) => boolean) {
        let index = -1;
        while (list[index + 1] && condition(list[index + 1])) {
            index++
        }
        return index
    }

    // 计算对应位置时间点的加速度
    static instantaneousAcceleration(a1: Accelerometer, a2: Accelerometer, time: BigNumber): Accelerometer {
        let t1 = time.sub(a1.time),
            t2 = a2.time.sub(time),
            t = a2.time.sub(a1.time);
        let state = add(multiply(a1.state, divide(t2, t)), multiply(a2.state, divide(t1, t)))
        return Accelerometer.createFromState(state, time)
    }

    // 预估一段位置中物体运动初速度与末速度 
    static guessVelocity(list: Array<Accelerometer>, p0: Point, p1: Point): InitialState {

        let sum = Equation.createSummationInitialValue(),
            count = list.length - 1,
            sumDisplacement = matrix([[0], [0]]),
            sumVelocity = matrix([[0], [0]]),
            factors = bignumber(0);

        for (let i = 0; i < count; i++) {
            Equation.integralSignAccelerationSummation(sum, list[i], list[i + 1])
        }

        let length = sum.time.length;

        for (let i = 0; i < length; i++) {
            let factor = sum.time[i].pow(2).div(2)
            sumVelocity = add(sumVelocity, multiply(sum.time[i], sum.acceleration[i]))
            sumDisplacement = add(sumDisplacement, multiply(sum.acceleration[i], factor))
            factors = factors.add(factor)
            factor = bignumber(0)
            for (let j = i + 1; j < length; j++) factor = factor.add(sum.time[i].mul(sum.time[j]))
            sumDisplacement = add(sumDisplacement, multiply(sum.acceleration[i], factor))
            factors = factors.add(factor)
        }

        return {
            displacement: p1.vector,
            velocity: add(divide(subtract(subtract(p1.vector, p0.vector), sumDisplacement), p1.time.sub(p0.time).div(1000)), sumVelocity) as Matrix,
            error: [divide(subtract(p1.error, p0.error), factors) as Matrix, divide(add(p1.error, p0.error), factors) as Matrix]
        }

    }

    // 一段时间内的位移
    static integralDisplacement(a0: Accelerometer, a1: Accelerometer, velocity: Matrix): InitialState {
        let time: BigNumber = a1.time.sub(a0.time).div(1000),
            acceleration: Matrix = divide(add(a0.state, a1.state), 2) as Matrix;
        velocity = multiply(acceleration, time)
        return {
            displacement: add(multiply(acceleration, time.pow(2).div(2)), multiply(velocity, time)),
            velocity
        }
    }

    static createSummationInitialValue(): SummationInitialValue {
        return {
            velocity: matrix([[0], [0]]),
            acceleration: [],
            time: [],
        }
    }

    static integralSignAccelerationSummation(sum: SummationInitialValue, a0: Accelerometer, a1: Accelerometer) {
        let time: BigNumber = a1.time.sub(a0.time).div(1000),
            acceleration: Matrix = divide(add(a0.state, a1.state), 2) as Matrix;
        sum.velocity = add(sum.velocity, multiply(acceleration, time))
        sum.acceleration.push(acceleration)
        sum.time.push(time)
    }

    static updateInertialError(sum: SummationInitialValue, errors: Matrix[], p0: Point, p1: Point,): InitialState {
        let sumDisplacement = matrix([[0], [0]]),
            sumVelocity = matrix([[0], [0]]),
            factors = bignumber(0),
            length = sum.time.length;
        for (let i = 0; i < length; i++) {
            let factor = sum.time[i].pow(2).div(2)
            sumVelocity = add(sumVelocity, multiply(sum.time[i], sum.acceleration[i]))
            sumDisplacement = add(sumDisplacement, multiply(sum.acceleration[i], factor))
            factors = factors.add(factor)
            factor = bignumber(0)
            for (let j = i + 1; j < length; j++) factor = factor.add(sum.time[i].mul(sum.time[j]))
            sumDisplacement = add(sumDisplacement, multiply(sum.acceleration[i], factor))
            factors = factors.add(factor)
        }

        let X_est: Matrix = add(p0.vector, sumDisplacement),
            E_ema: Matrix = subtract(p1.error, p0.error);

        let E_est = add(
            p0.error,
            errors.map(error => {
                error = multiply(error, factors)
                let diff: Matrix = subtract(E_ema, error)
                return {
                    error,
                    diff: multiply(transpose(diff), diff).get([0, 0])
                }
            }).reduce((cur, next) => {
                if (next.diff.lt(cur.diff)) return next
                else return cur
            }, { diff: bignumber(999999), error: matrix([[0], [0]]) }).error
        )

        let Q = multiply(E_est, transpose(E_est))
        let K = divide(Q, add(Q, p1.covariance)) as Matrix
        let X = add(X_est, multiply(K, subtract(p1.vector, X_est)))
        Q = multiply(subtract(identity(2), K), Q)
        E_ema = matrix([
            [Q.get([0, 0]).sqrt()],
            [Q.get([1, 1]).sqrt()],
        ])

        return {
            displacement: p1.vector,
            velocity: add(divide(subtract(subtract(X, p0.vector), sumDisplacement), p1.time.sub(p0.time).div(1000)), sumVelocity) as Matrix,
            error: [divide(subtract(E_ema, p0.error), factors) as Matrix, divide(add(E_ema, p0.error), factors) as Matrix]
        }
    }

    static simpleMeasureError(accuracy: number): Matrix {
        let singleError = bignumber(accuracy).pow(2)
        let crossError = bignumber(accuracy).pow(2).div(2)
        return matrix([
            [singleError, crossError],
            [crossError, singleError],
        ])
    }

    static updateEstimateSimple(K: Matrix, Z: Point, X: Point) {
        let result = add(X.vector, multiply(K, subtract(Z.vector, X.vector)))
        return new Point({
            x: result.get([0, 0]),
            y: result.get([1, 0]),
        })
    }

    static updateErrorOfEstimateSimple(K: Matrix, E: Point) {
        let result = multiply(subtract(1, K), E.vector)
        return new Point({
            x: result.get([0, 0]),
            y: result.get([1, 0]),
        })
    }

    static covariance(p1: Point, p2: Point): Matrix {
        let diff = subtract(p1.vector, p2.vector)
        return multiply(diff, transpose(diff))
    }

    static stateTransition(p1: Point, p2: Point): Matrix {
        return matrix([
            [p1.x.div(p2.x), 0],
            [0, p1.y.div(p2.y)],
        ])
    }

    static simga(P: Matrix, A: Matrix, X: Point): Matrix {
        // 计算偏移量
        let X_offest = sqrtm(multiply(n + lambda, P))

        let weighting = [
            {
                X: X.phalanx,
                weight: weight_0
            },
            {
                X: add(X.phalanx, multiply(X_offest, offset1)),
                weight: weight_i
            },
            {
                X: add(X.phalanx, multiply(X_offest, offset2)),
                weight: weight_i
            },
            {
                X: add(X.phalanx, multiply(X_offest, offset3)),
                weight: weight_i
            },
            {
                X: add(X.phalanx, multiply(X_offest, offset4)),
                weight: weight_i
            },
        ].map(({ X, weight }): { X: Matrix, weight: number } => {
            return {
                X: multiply(A, X),
                weight
            }
        }).reduce((cur, next) => {
            cur.X = add(cur.X, multiply(next.weight, next.X))
            cur.count += next.weight
            return cur
        }, { X: zeros(2), count: 0 })

        return divide(weighting.X, weighting.count) as Matrix
    }

    static generateCombinations<T>(elements: T[], k: number): T[][] {
        const combinations = [] as T[][];
        const n = elements.length;
        const indexes = Array.from({ length: k }, (_, i) => i);

        while (indexes[k - 1] < n) {
            const combination: T[] = indexes.map(index => elements[index]);
            combinations.push(combination);

            let i = k - 1;
            while (i >= 0 && indexes[i] === n - k + i) {
                i--;
            }

            if (i < 0) {
                break;
            }

            indexes[i]++;
            for (let j = i + 1; j < k; j++) {
                indexes[j] = indexes[j - 1] + 1;
            }
        }

        return combinations;
    }

    static simpleKalman(X: BigNumber, Z: BigNumber, E_est: BigNumber, E_mea: BigNumber): { value: BigNumber, error: BigNumber } {
        return {
            value: E_est.div(E_est.add(E_mea)).mul(Z.sub(X)).add(X),
            error: E_mea.mul(E_est).div(E_est.add(E_mea))
        }
    }

    static baseKalman(X: Point, Z: Point, P: Matrix, retain: Boolean): { point: Point, covariance: Matrix } {
        let P_het = add(X.covariance, P)
        let K = divide(P_het, add(P_het, Z.covariance))
        let value = add(X.vector, multiply(K, divide(Z.vector, X.vector))) as Matrix
        let covariance = multiply(divide(identity(2), K), P_het)
        return {
            point: new Point({ x: value.get([0, 0]), y: value.get([0, 1]), time: Z.time, covariance: retain ? Z.covariance : covariance }),
            covariance,
        }
    }

    static nearLinePoint({ x, y, accuracy }: WeightBeacon, { k, h, m }: Line, point: Point): Point {
        let dis = k.mul(x).add(h.mul(y)).add(m).abs().div(k.pow(2).add(h.pow(2)).sqrt())
        let step = 0.2

        if (dis.gt(accuracy)) {
            if (h.equals(0)) {
                k = bignumber(0)
                h = bignumber(1)
                m = y.mul(-1)
            } else if (k.equals(0)) {
                k = bignumber(1)
                h = bignumber(0)
                m = x.mul(-1)
            } else {
                m = x.div(k).add(y)
                k = bignumber(-1).div(k)
                h = bignumber(-1)
            }
        } else {
            // if (accuracy - dis < step) {
            //     if (h == 0) {
            //         x + m < 0 ? m += step : m -= step
            //     } else if (k == 0) {
            //         y + m < 0 ? m += step : m -= step
            //     } else {
            //         k * x + m > y ? m -= step : m += step
            //     }
            // }
        }

        let list: { x: BigNumber, y: BigNumber }[] = []
        if (h.equals(0)) {
            let A = accuracy.pow(2).sub(m.add(x).pow(2)).sqrt()
            list = [
                {
                    x: m.mul(-1),
                    y: y.add(A)
                },
                {
                    x: m.mul(-1),
                    y: y.sub(A)
                }
            ]
        } else if (k.equals(0)) {
            let A = accuracy.pow(2).sub(m.add(y).pow(2)).sqrt()
            list = [
                {
                    x: x.add(A),
                    y: m.mul(-1)
                },
                {
                    x: x.sub(A),
                    y: m.mul(-1)
                }
            ]
        } else {

            // 1+ k^2
            let A = k.pow(2).add(1)
            // 2 * (k * (m - y) - x)
            let B = m.sub(y).mul(k).sub(x).mul(2)
            let C = m.sub(y).pow(2).add(x.pow(2)).sub(accuracy.pow(2))

            let one = B.mul(-1).div(2).div(A)
            let two = B.pow(2).sub(A.mul(C).mul(4)).div(2).div(A)

            let x1 = one.sub(two)
            let x2 = one.add(two)

            list = [
                {
                    x: x1,
                    y: k.mul(x1).add(m)
                },
                {
                    x: x2,
                    y: k.mul(x2).add(m)
                },
            ]
        }

        let result = list.reduce((cur, next) => {
            if (cur.x.pow(2).add(cur.y.pow(2)).lt(next.x.pow(2).add(next.y.pow(2)))) {
                return cur
            } else {
                return next
            }
        })

        return new Point(result)
    }

    static fusionPoint(retain: Boolean, X: Point, Z: Point, P: Matrix = zeros(2) as Matrix): { point: Point, covariance: Matrix } {
        let result = null
        if (Z.time >= X.time) {
            result = Equation.baseKalman(X, Z, P, retain)
        } else {
            result = Equation.baseKalman(Z, X, P, retain)
        }
        return result
    }

    static weighting(beacons: WeightBeacon[], correlate: boolean = false): Point {
        let result = beacons.reduce((cur, next) => {
            cur.x = cur.x.add(next.weightX) // countx += nextX
            cur.y = cur.y.add(next.weightY)    // countY += nextY
            cur.weight = cur.weight.add(next.weight) // countWeight += nextWeight
            return cur
        }, { x: bignumber(0), y: bignumber(0), weight: bignumber(0) })
        let weightingX = result.x.div(result.weight).sqrt();
        let weightingY = result.y.div(result.weight).sqrt();

        return new Point({
            x: weightingX,
            y: weightingY,
            covariance: divide(beacons.reduce((cur, { x, y, weight }) => {
                let partialVariance = x.sub(weightingX).mul(y.sub(weightingY))
                return add(cur, multiply(weight, matrix([
                    [x.sub(weightingX).pow(2), partialVariance],
                    [partialVariance, y.sub(weightingY).pow(2)],
                ])))
            }, zeros(2)), result.weight) as Matrix
        })
    }

    static average(points: Point[], correlate: boolean = false): Point {
        let result = points.reduce((cur, next) => {
            cur.x = cur.x.add(next.x)
            cur.y = cur.y.add(next.y)
            return cur
        }, { x: bignumber(0), y: bignumber(0) })
        let weightingX = result.x.div(points.length);
        let weightingY = result.y.div(points.length);

        return new Point({
            x: weightingX,
            y: weightingY,
            covariance: divide(points.reduce((cur, { x, y }) => {
                let partialVariance = x.sub(weightingX).mul(y.sub(weightingY))
                return add(cur, matrix([
                    [x.sub(weightingX).pow(2), partialVariance],
                    [partialVariance, y.sub(weightingY).pow(2)],
                ]))
            }, zeros(2)), points.length - 1) as Matrix
        })
    }
}