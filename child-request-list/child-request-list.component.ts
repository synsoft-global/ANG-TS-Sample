/*
 * Project: Child.ECO - Subsidy Tracker
 * File: child-request-list.component.ts
 * 
 * Description:
 * this component provides view and access to daycare to accept or reject enrollment or withdrawal request, requested by parent
 */
import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonService, ParentService, LockerService } from 'src/app/shared/services';
import { ToastrService } from 'ngx-toastr';
import { ChildService } from 'src/app/shared/services/child/child.service';
import { DaycareService } from 'src/app/shared/services/daycare/daycare.service';
import { of, Subject } from 'rxjs';
import { map, debounceTime, distinctUntilChanged, flatMap } from 'rxjs/operators';
import { ToastMessages } from 'src/app/app.constants';

@Component({
  selector: 'app-child-request-list',
  templateUrl: './child-request-list.component.html',
  styleUrls: ['./child-request-list.component.css']
})
export class ChildRequestListComponent implements OnInit {
  @ViewChild('searchInput') private searchInput: ElementRef;

  subscriptions: any[] = [];
  Isshow: boolean = true;                 // use for pagination to show next page
  requestlist: any = [];                  // stores all request list data
  itemsToDisplay: any = [];               // use for view, enlarge when next page requested
  daycareList: any[] = [];                // all daycare name list
  collapseindex: number = 0;              // reqeuset accordion collapse status
  isCollapsed: boolean = true;            // accordion status
  isShowMore: boolean = true;             // user for pagination, show more option
  selectedDaycareId = 0;                  // selected daycare id from dropdown
  user: any;                              // loggged in user
  public keyUp = new Subject<any>();
  public search_name: string = '';        // search text 
  public index: number = 1;               // pagination index
  requestResult: any = {
    pages: 0,
    total: 0
  };

  constructor(private _commonService: CommonService,
    private _toastr: ToastrService, public _lockerService: LockerService,
    private _daycareService: DaycareService) {

    this.keyUp
      .pipe(map(event => event))
      .pipe(debounceTime(1000))
      .pipe(distinctUntilChanged())
      .pipe(flatMap((value) => {
        return of(this.getallrequest())
      }))
      .subscribe(console.log);
  }

  /**
   * init component
   */
  ngOnInit() {
    // unset selected daycare filter used accross Subsidy Tracker
    this._lockerService.removeStorage('trackerSelectedDaycareId');

    // get logged in user
    this.user = JSON.parse(this._lockerService.get('user'));

    // get all daycare name list for dropdown
    this.getDaycareList();
  }

  /**
   * get all daycare names list by daycare owner id
   */
  getDaycareList() {
    this.index = 1;
    if (this.user && this.user.id) {
      this.subscriptions.push(this._daycareService.getDaycareList(this.user.id).subscribe(
        res => {
          this.daycareList = [];
          if (res && res.success) {
            if (res.daycares && res.daycares.length > 0) {
              this.daycareList = res.daycares;

              // set first daycare name to default option if available
              if (this.daycareList[0]) {
                this.selectedDaycareId = this.daycareList[0].id;

                // get all request made to daycare
                this.getallrequest();
              }
            } else {
              this.showError({ 'message': ToastMessages.NO_RECORD_FOUND });
            }
          } else {
            this.showError({ 'message': res.message });
          }
        },
        err => {
          this.showError({ 'message': err.statusText });
        }
      ));
    } else {
      this.showError({ message: ToastMessages.NO_AUTH });
      // this.route.navigate(['/']);
    }
  }

  /**
   * get all reqeuests for daycare by daycare id
   */
  getallrequest() {
    this.isShowMore = true;
    // clear list and pagination if first page is requested
    if (this.index == 1) {
      this.requestlist = [];
      this.itemsToDisplay = [];
      this.index = 1;
    }
    let self = this;

    // get request by daycare id
    this.subscriptions.push(this._daycareService.getChildRequestbyDaycareId(this.selectedDaycareId, this.index, this.search_name).subscribe(
      res => {
        if (res && res.success) {
          // pagination
          this.requestResult.total = res.total;
          this.requestResult.pages = res.pages;
          if (res.childreq && res.childreq.length > 0) {
            // append data of new page to view
            self.requestlist = [...self.requestlist, ...res.childreq];
            self.addItems();
          }
          if (this.index == this.requestResult.pages || +this.requestResult.total == 0) {
            this.isShowMore = false;
          }
        } else {
          this.showError({ 'message': res.message });
        }
      }, err => {
        self.showError({ 'message': err.statusText });
        self._commonService.showLoading(false);
      }));
  }

  /**
   * function called when daycare selection changed, clear filters, get all request made to that daycare by id
   */
  onDaycareChange() {
    this.index = 1;
    this.search_name = '';
    this.getallrequest();
  }

  /**
   * function called when search text is changed, clear pagination, get request by daycare id and search key
   */
  onSearchChange() {
    this.index = 1;
    this.keyUp.next(this.search_name);
  }

  /**
   * used for pagination
   * increaments page number as index
   */
  onPageChange() {
    this.index = this.index + 1;
    this._commonService.showLoading(true);
    this.getallrequest();

  }

  /**
   * used for pagination
   * render next page to view
   */
  addItems() {
    this.itemsToDisplay = this.requestlist;
  }

  /**
   * function to update request status from 'Pending' to 'Accepted' or 'Rejected'
   * @param reqdata : {
      ParentId: number, // parent id,
      req_status: string, // daycare request status
      DaycareId, number, // daycare id
      Child: JSON, // child details
    }
   * @param status : string // 'Accepted' or 'Rejected'
   */
  onSatuschange(reqdata, status) {
    this.index = 1;
    let data = {
      status: status,
      ParentId: reqdata.ParentId,
      req_status: reqdata.req_status,
      DaycareId: reqdata.DaycareId,
      enrl_date: reqdata.Child.enrl_date ? reqdata.Child.enrl_date : null
    }

    // update request status by child id
    this.subscriptions.push(this._daycareService.updateChildDaycareRequest(reqdata.ChildId, data).subscribe(
      res => {
        if (res && res.success) {
          this.showSuccess(res.message);
          this.getallrequest()
        } else {
          this.showError({ 'message': res.message });
        }
      }, err => {
        this.showError({ 'message': err.statusText });
        this._commonService.showLoading(false);
      }));
  }

  /**
   * used for accordion
   * @param isCollapsed: boolean, // collapse accordion item
   * @param index: number // accordion index
   */
  collapse(isCollapsed, index) {
    if (this.collapseindex != index) {
      isCollapsed = true;
    }
    this.collapseindex = index;
    this.isCollapsed = isCollapsed ? false : true;
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
   * function to close keyboard on mobile after search button is pressed
   * @param event 
   */
  keyBoardClose(event) {
    let e = <KeyboardEvent>event;
    if (e.key == 'Enter') { this.searchInput.nativeElement.blur(); }
  }

  /**
  * function to destroy instance's subscriptions
  */
  ngOnDestroy() {
    this.subscriptions.forEach(s => s.unsubscribe());
  }
}

