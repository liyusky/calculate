import { filter, fromEvent } from "rxjs";
import { Answer, Collect, LifeCycle } from "../stream/stream";

let time: number = 0;

fromEvent<MessageEvent<EventMessage>>(self, 'message').subscribe(({ data }) => {
    switch (data.event) {
        case 'init':
            console.log(data);
            self.postMessage({ event: 'init', origin: 'worker', success: true })
            LifeCycle.next(data);
            break;
        case 'collect':
            Collect.next(data)
            break;
        case 'destroy':
            self.close()
            break;
    }
})

Answer.asObservable().pipe(
    filter(({ success }) => success),
).subscribe(data => {
    switch (data.event) {
        case 'location-measure':
            self.postMessage(Object.assign({}, data, { event: 'location', origin: 'worker', value: data.value.content, time: time ? data.time - time : 500 }))
            time = data.time
            break;
        case 'location-inertial':
            self.postMessage(Object.assign({}, data, { event: 'location', origin: 'worker', value: data.value.content, time: time ? data.time - time : 500 }))
            time = data.time
            break;
        case 'direction':
            self.postMessage(Object.assign(data, { value: data.value.toNumber() }))
            break;
    }
})
