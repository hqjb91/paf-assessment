import { Injectable } from "@angular/core";
import { HttpClient } from '@angular/common/http';
import { Observable } from "rxjs";
import { User } from "../models/user.model";


@Injectable({providedIn: 'root'})
export class AuthenticateService {

    private user: User;

    constructor(private http: HttpClient){}

    authenticateUser(user: User):Observable<any>{
        return this.http.post<any>('/login', user);
    }

    getUser(): User{
        return this.user;
    }

    setUser(user: User): void{
        this.user = user;
    }
}