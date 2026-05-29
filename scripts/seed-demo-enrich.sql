-- Demo enrichment for Brenner Precision Machining (org demo-m1).
-- Idempotent (INSERT OR REPLACE on deterministic ids). Safe to re-run.
-- Applied to the live successio-prod D1 so the one-click "Explore as owner"
-- demo lands on a fully populated dashboard, deal room, and Legacy Book.

UPDATE organizations
  SET annual_revenue = 6240000,
      description = 'Precision CNC machine shop in Akron, Ohio. Founded 1987 by Carl Brenner. 3- to 5-axis milling and turning for tooling, aerospace, and industrial customers. ISO 9001 certified.'
  WHERE id = 'demo-m1';

-- ── Financials (5-year trend, consistent with the $6.24M / 2025 milestone) ──
INSERT OR REPLACE INTO financials (id, org_id, year, revenue, gross_profit, ebitda, owner_compensation) VALUES
 ('demo-m1-fin-2021','demo-m1',2021,5100000,1632000,765000,285000),
 ('demo-m1-fin-2022','demo-m1',2022,5420000,1734400,813000,295000),
 ('demo-m1-fin-2023','demo-m1',2023,5680000,1817600,852000,305000),
 ('demo-m1-fin-2024','demo-m1',2024,5910000,1891200,886500,312000),
 ('demo-m1-fin-2025','demo-m1',2025,6240000,1996800,936000,320000);

-- ── Key people ──
INSERT OR REPLACE INTO employees (id, org_id, name, role, tenure_years, is_key_person, notes) VALUES
 ('demo-m1-emp-1','demo-m1','Carl Brenner','Owner / President',38,1,'Founder; plans to retire and transition ownership.'),
 ('demo-m1-emp-2','demo-m1','Marcus Reed','Shop Foreman',22,1,'Runs the floor day-to-day; holds most of the tribal knowledge on setups.'),
 ('demo-m1-emp-3','demo-m1','Linda Park','Quality Manager',15,1,'Owns ISO 9001 compliance and first-article inspection.'),
 ('demo-m1-emp-4','demo-m1','Tom Alvarez','Lead CNC Machinist',18,1,'Leads the 5-axis cell; trains apprentices.'),
 ('demo-m1-emp-5','demo-m1','Susan Bell','Office Manager',20,1,'AR/AP, payroll, and customer scheduling.'),
 ('demo-m1-emp-6','demo-m1','Derek Cho','Estimator',9,0,'Prepares quotes and job travelers.');

-- ── Customers (top of book; Goodyear anchor diversified to 19%) ──
INSERT OR REPLACE INTO customers (id, org_id, name, revenue_share, contract_status, notes) VALUES
 ('demo-m1-cust-1','demo-m1','Goodyear Tire & Rubber',0.19,'active','Anchor tooling contract since 1996.'),
 ('demo-m1-cust-2','demo-m1','Babcock & Wilcox',0.14,'active','Precision components on a multi-year blanket PO.'),
 ('demo-m1-cust-3','demo-m1','Summit Hydraulics',0.11,'month-to-month','Recurring short-run work.'),
 ('demo-m1-cust-4','demo-m1','Akron Aerospace Parts',0.10,'active','5-axis machined housings.'),
 ('demo-m1-cust-5','demo-m1','Lubrizol',0.08,'active','Lab fixtures and prototype work.'),
 ('demo-m1-cust-6','demo-m1','Davey Tree Equipment',0.07,'active','Replacement parts and short runs.');

-- ── Core processes / SOPs ──
INSERT OR REPLACE INTO processes (id, org_id, title, steps, owner, source) VALUES
 ('demo-m1-proc-1','demo-m1','Quoting a job','["Receive RFQ and drawings","Review tolerances and material","Estimate machine time and tooling","Add material, overhead, and margin","Send quote within 48 hours"]','Derek Cho','manual'),
 ('demo-m1-proc-2','demo-m1','First-article inspection (FAI)','["Pull the first part off the run","Measure all critical dimensions on the CMM","Record results against the drawing","QC sign-off before the full run","File the FAI report per ISO 9001"]','Linda Park','manual'),
 ('demo-m1-proc-3','demo-m1','Machine setup and changeover','["Stage material and tooling","Load and prove out the program","Set work and tool offsets","Run and verify the first piece","Release to the operator"]','Marcus Reed','manual'),
 ('demo-m1-proc-4','demo-m1','Job traveler workflow','["Open the traveler at job release","Stamp each operation as completed","Attach inspection records","Foreman final review","Close the traveler and archive"]','Marcus Reed','manual');
