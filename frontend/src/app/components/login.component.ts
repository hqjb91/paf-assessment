import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { User } from '../models/user.model';
import { AuthenticateService } from '../services/authenticate.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {

  form: FormGroup;
	errorMessage = '';

	constructor( private fb:FormBuilder, private router: Router, private authService:AuthenticateService ) { }

  ngOnInit(): void { 
    this.form = this.fb.group({
      "user_id": ['', Validators.required],
      "password": ['', Validators.required]
    })
  }
  
  processForm(): void {
    const user: User = { user_id: this.form.get("user_id").value, password: this.form.get("password").value };
    this.authService.authenticateUser(user).subscribe( response => {
      if(response.success){
        this.authService.setUser(user);
        this.router.navigate(['/main']);
      } 
    }, err => {
      this.errorMessage = err.error.error;
    });
  }

}
