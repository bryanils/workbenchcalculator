# Reports DB Schema Reference

## CRITICAL: USE THESE EXACT COLUMN NAMES

### snapshots

```sql
id, start_date, end_date, snapshot_at, snapshot_by, edited_at, edited_by,
is_deleted, deleted_at, deleted_by, total_loans, total_new_loans,
snapshot_type, is_finalized, finalized_at, finalized_by, metadata,
created_at, updated_at
```

**NOTE:** NO `date` column, NO `status` column. Use `start_date` and `is_deleted`.

### snapshot_employees

```sql
id, snapshot_id, capture_date, employee_id, dw_employee_id, username,
first_name, last_name, email, role, employment_status, lms_active,
reports_active, team_id, team_name, portfolio, loans_goal, buddy,
hourly_rate, hire_date, user_id, last_synced_email, is_deleted, created_at
```

### snapshot_loans

```sql
id, snapshot_id, snapshot_employee_id (DEPRECATED), employee_id,
assigned_to, in_ops, was_in_ops, loan_id, customer_id, portfolio,
status, conversion_type, loan_amount, approve_date, customer_first_name,
customer_last_name, loan_count, is_new_loan, list_name, promo_code,
created_by, capture_date, assignee_was_inactive, is_dispersed,
was_reversed, reversed_date, created_at
```

### snapshot_daily_aggregates

```sql
id, snapshot_id, capture_date, employee_id, username, team_id, team_name,
portfolio, total_loans, new_loans, returning_loans, dispersed_loans,
reversed_count, in_ops_count, is_finalized, finalized_at, created_at
```

### snapshot_daily_dials

```sql
id, snapshot_id, snapshot_employee_id (DEPRECATED), employee_id, date,
auto_dials, auto_dial_minutes, manual_dials, manual_dial_minutes,
inbound_calls, inbound_minutes, created_at
```

### snapshot_daily_timesheets

```sql
id, snapshot_id, snapshot_employee_id (DEPRECATED), employee_id, date,
at_work_time, at_lunch_time, productive_time, paid_pto_time,
tardy_count, created_at
```

### snapshot_daily_loan_summaries

```sql
id, snapshot_id, snapshot_employee_id (DEPRECATED), employee_id,
summary_id, date, loan_expectation, total_loans_assigned,
total_loans_as_buddy, total_loans_as_other, website_assigned_loans,
days_from_hire_to_loan, created_at
```

### snapshot_daily_commissions

```sql
id, snapshot_id, snapshot_employee_id (DEPRECATED), employee_id,
snapshot_loan_summary_id, date, commission_amount,
additional_dollars_per_hour, created_at
```

### employees

```sql
id, first_name, last_name, username, email, role, lms_active,
reports_active, employment_status, hire_date, team_id, buddy,
user_id, last_synced_email, dw_employee_id, is_deleted, created_at, updated_at
```

### loan_expectation_adjustments

```sql
id, employee_id, team_id, start_date, end_date, expectation,
created_at, updated_at
```

**NOTE:** NO `effective_date` column. Uses `start_date`/`end_date` range.

### teams

```sql
id, name, portfolio, leader_id, is_active, created_at, updated_at
```

### employee_status_history

```sql
id, employee_id, event_type, event_date, previous_team_id, new_team_id,
previous_status, new_status, notes, scheduled_action_id, created_by,
created_at
```

## LMS Columns (Portfolio Databases)

**loan table:**
- `Loan ID`, `Approve Date`, `Assigned To`, `Created By`, `Status`, `Conversion Type`

**audit_loan table:**
- `Loan ID`, `Action Date`, `Action User`, `Assigned To`

**user table:**
- `Username`, `Buddy`, `Loans Goal`, `User Type`
