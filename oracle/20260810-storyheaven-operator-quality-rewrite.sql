declare
  column_count number;
begin
  select count(*) into column_count
    from user_tab_columns
   where table_name = 'STORYHEAVEN_SERIAL_RUNS'
     and column_name = 'OPERATOR_REWRITE_COUNT';

  if column_count = 0 then
    execute immediate q'[
      alter table storyheaven_serial_runs add (
        operator_rewrite_count number(2) default 0 not null
          check (operator_rewrite_count between 0 and 20)
      )
    ]';
  end if;
end;
/

commit;
