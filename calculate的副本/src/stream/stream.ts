import { ReplaySubject, Subject } from "rxjs";

export const LifeCycle = new ReplaySubject<LifeCycleMessage>();

export const Answer = new Subject<AnswerMessage>();

export const Collect = new Subject<CollectMessage>();

export const Guess = new Subject<GuessMessage>();


