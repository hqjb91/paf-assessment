import { Component, OnInit } from '@angular/core';
import { Form, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { CameraService } from '../camera.service';
import { User } from '../models/user.model';
import { AuthenticateService } from '../services/authenticate.service';
import { PostService } from '../services/post.service';

@Component({
  selector: 'app-main',
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.css']
})
export class MainComponent implements OnInit {

	imagePath = '/assets/cactus.png';
	form: FormGroup;
	imageFlag: boolean = false;

	constructor(private cameraSvc: CameraService, private fb: FormBuilder, private router: Router,
				private authService: AuthenticateService, private postService: PostService) { }

	ngOnInit(): void {
	  if (this.cameraSvc.hasImage()) {
		  const img = this.cameraSvc.getImage();
		  this.imagePath = img.imageAsDataUrl;
		  this.imageFlag = true;
	  }

	  this.form = this.fb.group({
		  title: ['', Validators.required],
		  comments: ['', Validators.required]
	  })
	}

	clear() {
		this.imagePath = '/assets/cactus.png';
		this.imageFlag = false;
	}

	processForm(){

		const user: User = this.authService.getUser();

		const formData = new FormData();
		formData.set('title', this.form.get("title").value);
		formData.set('comments', this.form.get("comments").value);
		formData.set('user_id', user.user_id);
		formData.set('password', user.password);
		formData.set('document', this.cameraSvc.getImage().imageData);

		this.postService.uploadPost(formData).subscribe( response => {
			this.clear();
			this.form.reset();
		}, err => {
			if(err.status.toString() == '401') {
				this.router.navigate(['/']);
			}
			console.error(err.error);
		});
	}
}
