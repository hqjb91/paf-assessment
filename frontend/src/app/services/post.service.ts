import { Injectable } from "@angular/core";
import { HttpClient } from '@angular/common/http';
import { Observable } from "rxjs";


@Injectable({providedIn: 'root'})
export class PostService {

    constructor(private http: HttpClient){}

    uploadPost(formData: FormData):Observable<any>{
        return this.http.post<any>('/upload', formData);
    }
}