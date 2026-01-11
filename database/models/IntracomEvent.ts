import { Model } from '@nozbe/watermelondb';
import { field, json } from '@nozbe/watermelondb/decorators';

export interface IntracomEventModel {
    id: string;
    date: string;
    type: string;
    name: string;
    campusSlug: string;
    registeredStudents: number;
    nbNewStudents: number;
    maxStudents: number;
    position?: {
        latitude: number;
        longitude: number;
    };
}


export default class IntracomEvent extends Model {
    static table = 'intracomevents';

    @field('id')
    private _id!: string;
    public get id(): string {
        return this._id;
    }
    public set id(value: string) {
        this._id = value;
    }
    @field('date') date!: string;
    @field('type') type!: string;
    @field('name') name!: string;
    @field('campusSlug') campusSlug!: string;
    @field('registeredStudents') registeredStudents!: number;
    @field('nbNewStudents') nbNewStudents!: number;
    @field('maxStudents') maxStudents!: number;

    @json('position', (rawJson) => rawJson)
    position?: {
        latitude: number;
        longitude: number;
    };
}