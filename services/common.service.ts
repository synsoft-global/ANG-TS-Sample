/*
 * Project: Child.ECO - Subsidy Tracker
 * Author: Ayush Kushwah <ayush.synsoft@gmail.com>
 * File: common.service.ts
 * 
 * Description:
 * some common function used accorssed the application
 */
import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { LockerService } from '../locker';
import { Router } from '@angular/router';
import { FormGroup, FormArray } from '@angular/forms';

@Injectable({
  providedIn: 'root'
})
export class CommonService {

  constructor(private _lockerService: LockerService, private _router: Router) { }

  private loadingPropertyChanged = new Subject<boolean>();    // handles the loader show/hide events
  private isLoggedInPropertyChanged = new Subject<any>();     // checks auth. accross different pages
  private loginPropertyChanged = new Subject<boolean>();      // checks if user already logged in
  private userPropertyChanged = new Subject<boolean>();       // if user updates thier details while logged in

  // events that can be subscribe are written here

  isLoggedInPropertyChanged$: Observable<any> = this.isLoggedInPropertyChanged.asObservable();

  loadingPropertyChanged$: Observable<boolean> = this.loadingPropertyChanged.asObservable();

  loginPropertyChanged$: Observable<boolean> = this.loginPropertyChanged.asObservable();

  userPropertyChanged$: Observable<any> = this.userPropertyChanged.asObservable();

  // show/hide loader
  showLoading(value) {
    this.loadingPropertyChanged.next(value)
  }

  // checks if user already logged in
  showLogin(value) {
    this.loginPropertyChanged.next(value)
  }

  onIsLoggedIn(value) {
    this.isLoggedInPropertyChanged.next(value)
  }

  // call this method when user updates their details while logged in
  onUserUpdate(value) {
    this.userPropertyChanged.next(value)
  }

  /**
   * function to check validations and show validations message of a form group
   * @param _fa : FormGroup
   */
  public checkFormGroupValidations(_fa: FormGroup) {
    (<any>Object).values(_fa.controls).forEach(control => {
      control.markAsTouched();
      if (control.controls) {
        this.checkFormGroupValidations(control);
      }
    });
  }

  /**
   * function to check validations and show validations message of a form array
   * @param _fa : FormArray
   */
  public checkFormArrayValidations(_fa: FormArray) {
    (<any>Object).values(_fa.controls).forEach(control => {
      control.markAsTouched();
      if (control.controls) {
        this.checkFormArrayValidations(control);
      }
    });
  }

  /**
   * function to trim all FormControl values before sending to the server
   * @param values 
   */
  public trimFormGroupValues(values) {
    let keys = Object.keys(values);
    keys.map(key => {
      if (typeof values[key] == 'string') {
        values[key] = values[key].trim();
      }
    });
  }

  /**
   * call this method to logout and clear session
   */
  clearLogoutHistory() {
    let role = this._lockerService.get('userrole');
    if (role && role != 'Parent')
      this._router.navigate(['/login-daycare']);
    else
      this._router.navigate(['/']);
    this._lockerService.del('token');
    this._lockerService.del('user');
    this._lockerService.del('loggedInSession');
    this._lockerService.del('userrole');
    this._lockerService.del('trackerSelectedDaycareId');
    this.onIsLoggedIn({ Status: false, Role: "" });
  }
}
