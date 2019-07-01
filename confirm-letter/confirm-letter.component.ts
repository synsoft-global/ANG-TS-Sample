/*
 * Project: Child.ECO - Subsidy Tracker
 * File: confirm-letter.component.ts
 * 
 * Description:
 * component for add/edit confirmation letter for parent role
 */
import { Component, OnInit } from '@angular/core';
import * as moment from 'moment';
import { Moment } from 'moment';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { CommonService, Validator, AuthService, LockerService } from 'src/app/shared/services';
import {
  DateTimeAdapter,
  OWL_DATE_TIME_FORMATS,
  OWL_DATE_TIME_LOCALE,
  OwlDateTimeComponent,
  OwlDateTimeFormats
} from 'ng-pick-datetime';
import { FormGroup, FormBuilder, FormControl, FormArray } from '@angular/forms';
import { ChildService } from 'src/app/shared/services/child/child.service';
import { ComfirmLetterService } from 'src/app/shared/services/confirm-letter/comfirm-letter.service';
import { MomentDateTimeAdapter } from 'ng-pick-datetime-moment';
import { Configuration, MaxFileUploadSize, ToastMessages, AllowedFileFormats } from 'src/app/app.constants';
import { _ } from 'underscore';

// month selection date time formation on view
export const MY_MOMENT_DATE_TIME_FORMATS: OwlDateTimeFormats = {
  parseInput: 'MMM YYYY',
  fullPickerInput: 'l LT',
  datePickerInput: 'MMM YYYY',
  timePickerInput: 'LT',
  monthYearLabel: 'MMM YYYY',
  dateA11yLabel: 'LL',
  monthYearA11yLabel: 'MMMM YYYY',
};

@Component({
  selector: 'app-confirm-letter',
  templateUrl: './confirm-letter.component.html',
  styleUrls: ['./confirm-letter.component.css'],
  providers: [
    { provide: DateTimeAdapter, useClass: MomentDateTimeAdapter, deps: [OWL_DATE_TIME_LOCALE] },

    { provide: OWL_DATE_TIME_FORMATS, useValue: MY_MOMENT_DATE_TIME_FORMATS },
  ],
})
export class ConfirmLetterComponent implements OnInit {
  subscriptions: any[] = [];            
  issuedate: any = [];                    // letter issue date
  issuedates: string = '';                // letter issue date as ISO string
  companyletterId: string = '';           // confirmation letter id
  monthvalue: any[] = [];                 // month timeline array list
  user: any;                              // current user
  children: any = [];                     // children list
  today: Date = new Date();               // today's date
  image_path: any = null;                 // stores uploaded image path
  daycare_id: number = 0;                 // daycare id        
  childConfirmatoinHistories: any = [];   // data of preselected children applied to confirmation letter
  initialDetails: any;                    // details of month timeline uploaded by parent
  startMonth: any;                        // start month of month timeline
  monthCount: number = 6;                 // max month timeline length

  confirmationLetterForm: FormGroup;
  constructor(private route: ActivatedRoute,
    public _toastr: ToastrService, public router: Router, public _commonService: CommonService,
    private _fb: FormBuilder, private _childService: ChildService,
    private _authService: AuthService, private _lockerService: LockerService,
    private _confirmLetterService: ComfirmLetterService,
    private _config: Configuration
  ) {
    this.confirmationLetterForm = _fb.group({
      issue_date: new FormControl(new Date(),
        Validator.required
      ),
      uploaded_by_role: new FormControl(''),
      childrenApplied: new FormArray([]),
      start_month: new FormControl(null, Validator.required),
      end_month: new FormControl(null, Validator.required),
      status: new FormControl(''),
    })
  }

  /**
   * init component
   */
  ngOnInit() {
    // get logged in user details
    this.user = JSON.parse(this._lockerService.get('user'));

    // get route params
    this.subscriptions.push(this.route.params.subscribe(params => {
      if (params['id']) {
        this.companyletterId = params['id'];
      }
    }));

    // for new letter get all child for selection otherwise get all child and mark selection
    if (this.companyletterId) {
      this.getConfirmLetterById();
    } else {
      this.getallChildByParent();
    }

    // get role of the logged in user
    let role = this._lockerService.get('userrole') ? this._lockerService.get('userrole') : 'parent';
    this.confirmationLetterForm.controls.uploaded_by_role.setValue(role);
  }

  /**
   * function to create month timeline on view
   * @param startMonth : date, // get month from this date to start timeline
   * @param pop : boolean, // if true remove the last month
   * @param monthCount : number // upto which timeline has more months
   */
  onStartDateChange(startMonth, pop = false, monthCount = null) {
    // set selected start month date on view
    this.confirmationLetterForm.controls.start_month.setValue(new Date(moment(startMonth).local().format('MM/DD/YYYY')));

    // remove month if pop is true
    if (monthCount) {
      this.monthCount = monthCount -1;
    } else {
      this.monthCount = pop ? --this.monthCount : 5;
    }

    // calc end month date
    let endMonth = moment(moment(startMonth)).add(this.monthCount, 'months').local().format('MM/DD/YYYY');
    endMonth = moment(moment(startMonth)).add(this.monthCount, 'months').local().format('MM/DD/YYYY');
    this.confirmationLetterForm.controls.end_month.setValue(new Date(endMonth));

    // create month timeline upto 6 months
    this.getmonths(startMonth, endMonth, pop);
  }

  /**
   * set selected end month date on view
   * @param endMonth 
   */
  onendDateChange(endMonth) {
    this.monthCount = 5;
    this.confirmationLetterForm.controls.end_month.setValue(new Date(moment(endMonth).local().format('MM/DD/YYYY')));
    let startMonth = moment(moment(endMonth)).subtract(this.monthCount, 'months').local().format('MM/DD/YYYY');
    this.confirmationLetterForm.controls.start_month.setValue(new Date(startMonth));

    // create month timeline upto 6 months
    this.getmonths(startMonth, endMonth);
  }

  /**
   * function to create month timeline upto 6 months
   * @param startMonth : date, // date from which start month extracted
   * @param endMonth : date, // date from which end month extracted
   * @param pop 
   */
  getmonths(startMonth, endMonth, pop = false) {
    endMonth = new Date(endMonth);
    this.monthvalue = [];
    var dateStart = moment(startMonth).local();
    var dateEnd = moment(endMonth).local();

    // add month to timeline until startMonth is not equal to endMonth
    while (dateEnd > dateStart || dateStart.format('M') === dateEnd.format('M')) {
      this.monthvalue.push(dateStart.format('MMM YYYY'));
      dateStart.add(1, 'month');
    }

    // if month poped remove from confirmationLetterForm
    if (pop) {
      for (let i = 0; i < (<FormArray>this.confirmationLetterForm.controls.childrenApplied).controls.length; i++) {
        // remove last month
        (<FormArray>(<FormGroup>(<FormGroup>(<FormArray>this.confirmationLetterForm.controls.childrenApplied).controls[i]).controls.child).controls.details).removeAt((<FormArray>(<FormGroup>(<FormGroup>(<FormArray>this.confirmationLetterForm.controls.childrenApplied).controls[i]).controls.child).controls.details).length - 1);
      }
    } else {
      // add month detail for each child and patch save value on edit otherwise set 0 as amount
      for (let i = 0; i < this.children.length; i++) {
        (<FormArray>(<FormGroup>(<FormGroup>(<FormArray>this.confirmationLetterForm.controls.childrenApplied).controls[i]).controls.child).controls.details) = new FormArray([]);

        // add month control to confirmationLetterForm
        this.monthvalue.map((month, idx) => {
          // childAppliedDetails form
          (<FormArray>(<FormGroup>(<FormGroup>(<FormArray>this.confirmationLetterForm.controls.childrenApplied).controls[i]).controls.child).controls.details).push(this._fb.group({
            month: new FormControl(''),
            amount: new FormControl(0)
          }));
          (<FormArray>(<FormGroup>(<FormGroup>(<FormArray>this.confirmationLetterForm.controls.childrenApplied).controls[i]).controls.child).controls.details).controls[idx].patchValue({ month: month, amount: 0 });
        });
      }
    }
  }

  /**
   * get all parent children
   * @param date : date, // if new letter than create month timeline from current date otherwise use saved startMonth date 
   */
  getallChildByParent(date = new Date()) {
    if (this.user && this.user.id) {
      this.subscriptions.push(this._childService.getallChildByParent(this.user.id).subscribe(
        res => {
          this.children = [];
          if (res && res.success) {
            // use api response data for view
            this.startMonth = date;

            // calc month count for edit or use 6 as month count for add
            let monthCount = this.monthCount;
            if (this.childConfirmatoinHistories && this.childConfirmatoinHistories[0] && this.childConfirmatoinHistories[0].details && this.childConfirmatoinHistories[0].details.length) {
              monthCount = this.childConfirmatoinHistories[0].details.length;
            }

            // set month timeline start date
            this.onStartDateChange(date, false, monthCount);

            if (res.children && res.children.length > 0) {
              this.children = res.children;
              this.daycare_id = this.children[0].DaycareId;
              
              // create month timeline details form for saved record
              this.createDetailsForm();
            } else {
              this.showError({ message: ToastMessages.NO_RECORD_FOUND })
            }

            // console.log(this.confirmationLetterForm.controls.childrenApplied.controls[0].controls.child.controls.childInfo.value.name);

          } else {
            this.showError({ 'message': res.message });
          }
        },
        err => {
          this.showError({ 'message': err.statusText });
        }
      ));
    } else {
      this.showError({ message: 'Please relogin' });
      this.router.navigate(['/']);
    }
  }

  /**
   * this functions create month detail form by adding month to timeline one by one for both view, add and edit
   */
  createDetailsForm() {
    let self = this;

    // loop through all children
    self.children.map((child, i) => {
      let childAppliedDetails: FormArray = new FormArray([]);

      // add initial details to form value
      if (this.initialDetails) {
        child['initial_details'] = this.initialDetails;
      }

      // month detail form array for all children
      let monthDetailForm: FormArray = <FormArray>self.confirmationLetterForm.controls.childrenApplied;

      // always set letter status to 'Pending' if parent add/edit letter
      if (child.request_status == 'Pending') {
        child.DaycareId = null;
      }

      // append child details to form for submission
      monthDetailForm.push(self._fb.group({
        child: self._fb.group({
          childInfo: new FormControl(child),
          details: childAppliedDetails,
          status: new FormControl('Pending')
        })
      }))

      // add month to form one by one
      self.monthvalue.map((month, idx) => {
        // childAppliedDetails form
        childAppliedDetails.push(self._fb.group({
          month: new FormControl(''),
          amount: new FormControl(0),
        }));

        childAppliedDetails.controls[idx].patchValue({ month: month, amount: 0 })
      });

      // patch history details to form on edit view
      monthDetailForm.controls[i].disable();
      if (self.childConfirmatoinHistories) {
        self.childConfirmatoinHistories.map((savedChild, index) => {
          if (savedChild.ChildId == child.id) {

            (<FormGroup>(<FormGroup>monthDetailForm.controls[i]).controls.child).controls.status.setValue(savedChild.status);

            monthDetailForm.controls[i].enable();
            self.monthvalue.map((month, idx) => {
              childAppliedDetails.controls[idx].patchValue({ month: month, amount: savedChild.details[idx].amount });
            })
          }

        })
      }
    });

  }

  /**
   * reset a month detail form's amount value to 0s
   * @param index : number, // index of child history form
   */
  resetAmountFields(index) {
    let details: FormArray = (<FormArray>(<FormGroup>(<FormGroup>(<FormArray>this.confirmationLetterForm.controls.childrenApplied).controls[index]).controls.child).controls.details);

    details.controls.map((month, idx) => {
      details.controls[idx].patchValue({ amount: 0 })
    });
  }

  /**
   * function called only on edit, gets confirmation letter details on edit and gets all children than patch responses to create form view
   */
  getConfirmLetterById() {
    this.initialDetails = null;
    this.subscriptions.push(this._confirmLetterService.getConfirmLetterById(this.companyletterId).subscribe(
      res => {
        if (res && res.success) {
          if (res && res.confirmletters) {
            // patch details to form for view
            this.confirmationLetterForm.patchValue(res.confirmletters);

            if (res.confirmletters.ChildConfirmatoinHistories[0]) {
              let history = res.confirmletters.ChildConfirmatoinHistories[0];
              let startMonth = new Date(history.start_month);

              if (history.initial_details) {
                this.initialDetails = history.initial_details;
              }

              this.childConfirmatoinHistories = res.confirmletters.ChildConfirmatoinHistories;
              this.image_path = res.confirmletters.image_path;

              // get all children and set month start and end
              this.getallChildByParent(startMonth);
            } else {
              this.showError({ message: ToastMessages.NO_RECORD_FOUND });
              // this.router.navigate(['parent', 'confirm']);
            }
          } else {
            this.showError({ message: ToastMessages.NO_RECORD_FOUND });
          }
        } else {
          this.showError({ 'message': res.message });
        }
      },
      err => {
        this.showError({ 'message': err.statusText });
      }
    ));
  }

  /**
   * function to handle issue date change event
   * @param value : date
   */
  onIssueDateChange(value) {
    this.issuedate = moment(value).format('MM/YYYY');
    this.issuedates = this.issuedate;
  }

  /**
   * function to handle date picker month select event, and close after month selection
   * @param normalizedMonth : moment, // selected mont
   * @param datepicker : element, // calander instance
   * @param input : string // calander input name
   */
  chosenMonthHandler(normalizedMonth: Moment, datepicker: OwlDateTimeComponent<Moment>, input) {
    // this.startdate.value = moment(normalizedMonth);
    let date = moment(normalizedMonth).local();

    if (input == 'issue') {

    }
    // if startMonth date is changed, set selected date, create 6 months timeline from selected date
    if (input == 'start') {
      this.startMonth = date;
      this.onStartDateChange(date);
    }
    // if endMonth date is changed, set selecte date, create month timeline from 6 month behind to selected date
    if (input == 'end') {
      this.onendDateChange(date);
    }
    datepicker.close();
  }

  /**
   * function to remove last month from month details form
   */
  popMonth() {
    // set second param pop as true
    this.onStartDateChange(this.startMonth, true);
  }

  /**
   * upload confirmation letter, service call returns image_path of uploaded image, JPEG
   * @param files : File[], // files to upload
   */
  uploadConfirmationLetter(files: FileList) {
    let file = files[0];
    if (file) {
      if (_.contains(AllowedFileFormats, file.type)) {
        if (file.size <= MaxFileUploadSize) {
          if (this.user && this.user.id && this._lockerService.get('userrole')) {
            this.subscriptions.push(this._authService.uploadFile(file).subscribe(
              res => {
                if (res && res.success) {
                  console.log(res);
                  if (res.image_path) {
                    // this.confirmationLetterForm.controls.image_path.setValue("");
                    this.image_path = res.image_path;
                  }
                  this.showSuccess(res.message)
                } else {
                  this.showError({ 'message': res.message });
                }
              },
              err => {
                this.image_path = null;
                this.showError({ 'message': err.statusText });
              }
            ));
          } else {
            this.showError({ message: 'Please relogin' });
            this.router.navigate(['/']);
          }
        } else {
          this.image_path = null;
          this.showError({ message: ToastMessages.FILE_LIMIT_EXCEEDS });
        }
      } else {
        this.image_path = null;
        this.showError({ message: ToastMessages.INVALID_FILE_TYPE });
      }
    } else {
      this.image_path = null;
      this.showError({ message: ToastMessages.FILE_UPLOAD_CANCELLED });
    }
  }

  /**
   * function to set or unset applied confirmation letter to a child
   * @param index : number, // child index
   * @param event : boolean, // checkbox value
   */
  assignChild(index, event) {
    let childrenApplied = <FormArray>this.confirmationLetterForm.controls.childrenApplied;
    // if checked unset child from applying letter otherwise set the child to update
    if (event && event.target && event.target.checked) {
      childrenApplied.controls[index].disable();
    } else {
      childrenApplied.controls[index].enable();
    }
  }

  /**
   * function to save confirmation letter
   */
  onSave() {
    let atleastOneChildSelected = false;
    let form: FormArray = <FormArray>this.confirmationLetterForm.controls.childrenApplied;

    // check if user selected atleast on child to apply confirmation letter, and set letter status to Pending if parent is updating letter
    for (let i = 0; i < form.controls.length; i++) {
      if (form.controls[i].enabled) {
        atleastOneChildSelected = true;
        (<FormGroup>(<FormGroup>form.controls[i]).controls.child).controls.status.setValue('Pending');
      }
    }

    if (this.image_path) {
      if (atleastOneChildSelected) {
        
        this.confirmationLetterForm.value.image_path = this.image_path;
        this.confirmationLetterForm.value.parent_id = this.user.id;
        this.confirmationLetterForm.value.daycare_id = this.daycare_id;

        // if letter id exists update otherwise add new confirmation letter
        if (this.companyletterId) {
          this.updateConfirmLetter();
        } else {
          this.registerConfirmLetter();
        }
      } else {
        this.showError({ message: ToastMessages.NO_CHILD_SELECTION })
      }
    } else {
      this.showError({ message: ToastMessages.FILE_UPLOAD_CANCELLED })
    }
  }

  /**
   * function to send back to previous page
   */
  onCancel() {
    this.router.navigate(['parent', 'confirm']);
  }

  /**
   * function to add new confirmation letter
   */
  registerConfirmLetter() {
    this.subscriptions.push(this._confirmLetterService.registerConfirmLetter(this.confirmationLetterForm.value).subscribe(
      res => {
        if (res && res.success) {
          this.showSuccess(res.message);
          this.router.navigate(['parent', 'confirm']);
        } else {
          this.showError({ 'message': res.message });
        }
        // this.image_path = null;
      },
      err => {
        this.showError({ 'message': err.statusText });
      }
    ));
  }

  /**
   * function to update confirmation letter
   */
  updateConfirmLetter() {
    this.subscriptions.push(this._confirmLetterService.updateConfirmLetter(this.companyletterId, this.confirmationLetterForm.value).subscribe(
      res => {
        if (res && res.success) {
          this.showSuccess(res.message);
          this.router.navigate(['parent', 'confirm']);
        } else {
          this.showError({ 'message': res.message });
        }
        // this.image_path = null;
      },
      err => {
        this.showError({ 'message': err.statusText });
      }
    ));
  }

  /**
   * function to show success toast
   * @param message : string // message 
   */
  showSuccess(message) {
    this._toastr.clear();
    this._toastr.success('', message);
  }

  /**
   * function to show error message
   * @param res : JSON // if message is 'Unauthorized user.' log out otherwise show error
   */
  showError(res) {
    this._toastr.clear();
    if (res.message == 'Unauthorized user.') {
      this._toastr.error('', res.message); //unauthMessage
      this._commonService.clearLogoutHistory();
    } else if (res.message != undefined) {
      if (res.message && res.message.name)
        this._toastr.error('', res.message.name);
      else
        this._toastr.error('', res.message);
    }
  }

  /**
   * function to destroy instance's subscriptions
   */
  ngOnDestroy() {
    this.subscriptions.forEach(s => s.unsubscribe());
  }
}
