import * as fs from 'fs/promises';
import * as readline from 'readline';

import { getModel } from './ai/providers';
import {
  deepResearch,
  writeFinalAnswer,
  writeFinalReport,
} from './deep-research';
import { understandRequirementNew } from './understand-requirment';

// Helper function for consistent logging
function log(...args: any[]) {
  console.log(...args);
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Helper function to get user input
export function askQuestion(query: string): Promise<string> {
  return new Promise(resolve => {
    rl.question(query, answer => {
      resolve(answer);
    });
  });
}

// run the agent
async function run() {
  console.log('Using model: ', getModel().modelId);

  // Get initial query
  const initialQuery =
    (await askQuestion(
      'What would you like to research? (default food order app) ',
    )) ||
    `Classification: Official
Publication approval reference: PAR1304
Approved Costing Guidance 2022
Minimum software
requirements
The functional software requirements to
implement the costing standards
Version 1, March 2022
1 | Contents
Contents
1. Introduction ................................................................................ 2
2. Functional requirements ............................................................ 8
3. Future requirements................................................................. 41
4. Test plan .................................................................................. 41
Appendix 1: Unmatched activity................................................... 42
Appendix 2: Data validation scenarios......................................... 43
Appendix 3: Costing process diagram*........................................ 47
2 | Introduction
1. Introduction
1. In this document we1 set out the minimum requirements for the costing
software needed to:
• implement the healthcare costing standards for England available on the
NHS England and NHS Improvement website
• produce the National Cost Collection and the other patient-level cost
collections under development.
2. These are not mandatory technical requirements for costing software, nor do
they provide a full system specification. They are functional requirements we
recommend providers use when procuring a costing software product or
agreeing changes to their existing software, to enable them to implement the
standards and applicable cost collection guidance effectively. Acute trusts will
be supported by an information standard notice (ISN) issued by NHS Digital.
There will be ISNs for mental health, community, and ambulance trusts. We
are in the process of agreeing the timeline for the release of these documents.
3. The information standards guide the processing of costing information for the
National Cost Collection. NHS providers will need to have regard to these in
accordance with Section 250 of the Health and Social Care Act 2012.
4. Appropriate costing software is essential for NHS providers to successfully
implement the costing standards and produce the National Cost Collection. As
set out in the Approved Costing Guidance, the standards will be mandatory for
recording and collecting 2021/22 cost data relating to acute, ambulance,
community, and mental health services.
1
In this document, ‘we’ (NHS England and NHS Improvement) refers to Monitor exercising
functions under Chapter 4 of Part 3 of the Health and Social Care Act 2012, unless
otherwise stated.
3 | Introduction
Audience
5. This document is aimed at:
• software suppliers that currently provide healthcare costing software or may
be interested in producing such software
• costing practitioners and information managers so they can implement the
appropriate software and ensure it meets the minimum requirements as
outlined in this document and subsequent updates.
• procurement managers to support the procurement process for purchasing
costing software.
6. We ask NHS providers that have built or intend to build in-house costing
software to meet these requirements to contact the costing team at NHS
England and NHS Improvement (costing@england.nhs.uk) to discuss their
product.
Overview
7. The Costing Transformation Programme (CTP) focuses on patient-level
costing to deliver a step change in the quality of the cost information produced
by NHS providers.
8. Improving understanding of the cost of patient care by guiding the transition
from reference costs to patient-level information and costing systems (PLICS)
will help improve service efficiency, both at local level through comparison
with peers and at national level by – for example – setting prices that better
reflect the resources consumed to deliver patient care.
9. Specifically, the CTP will enable providers to:
• review their use of resources to ensure that frontline and support services
are being provided as efficiently and effectively as possible
• evaluate clinical practice – patient-level cost information combined with
service quality and patient outcome information allows clinical teams and
organisations to compare their performance with their peers
• support better ways of working – cost information is useful in assessing the
impact of clinical initiatives and new patient-centred models of care that
cross traditional organisational and geographical boundaries.
4 | Introduction
10. It will enable national bodies to:
• support a sustainable healthcare system by providing a costing tool with
which to identify best practice, as well as ineffective or inefficient practices
• improve the foundations of the payment system by providing flexible
building blocks to inform payment currency development and allow setting
of prices that more accurately reflect how resources are consumed to
deliver patient care.
Costing software (minimum requirements)
11. The minimum requirements are the software functional requirements we have
identified as necessary to support the implementation of the healthcare
costing standards for providers of NHS services in England. The functions
include the ability to:
• import minimum datasets, as defined by the costing standards (eg episode
type is a costing defined/required field in the admitted patient care feed)
• apply cost allocation methods (defined by the costing standards)
• output high quality patient-level cost data for local reporting and National
Cost Collections.
Healthcare costing standards for England
12. Acute providers submitted the first mandated collection of patient-level costs
in 2019 followed by mental health and ambulance providers in 2020. We also
ran an early implementer collection with community providers in 2020..
13. Revised versions of the costing standards as part of the Approved Costing
Guidance are being released in March 2021. These standards give:
• information requirements – that is, the data that needs to be collected for
costing, matching and collection purposes
• details of the costing processes and approaches to improve the costing of
NHS services and procedures.
National Cost Collection
14. We have developed a central infrastructure to store and analyse patient-level
cost data for comparison purposes and informing the national tariff. The
Approved Costing Guidance outlines the requirements for the collection of
5 | Introduction
aggregated cost and patient-level information for acute, ambulance, mental
health, and community services.
Context
15. There is currently inconsistency across providers in the costing processes
used by costing practitioners, leading to inconsistent cost information
nationally. Variation in the costing software used is one cause of this problem.
16. The minimum software requirements support:
• consistent cost allocation, helping to reduce variation in costing systems
• transparency and traceability in costing to trace the exact origin of
patient-level costs in the costing software
• granular cost information to identify exactly what resources have been
allocated to patients, and their amount
• flexible systems to keep up with changes to datasets, costing standards or
National Cost Collections.
Costing software requirements timeline
17. We revise and reissue the minimum software requirements annually (see
Table 1). Revisions reflect changes to the costing process and user needs to
ensure the software continues to support the costing standards and local
requirements.
18. To allow appropriate time for suppliers and providers to implement the costing
standards and minimum requirements, we created a transitional plan.
• For acute trusts: In 2021 (Year 4) there are no new 'must’ or ‘should’
requirements for 2022 collections.
• For ambulance and mental health trusts: In 2019 (Year 1), requirements
that were a ‘should’ priority became ‘musts’ for 2020 collections. In 2020
(Year 2) there were no new ‘must’ requirements, but new ‘should’
requirements have become ‘must’ requirements for 2021 collections. In
2021 (Year 3) there are no new 'must’ or ‘should’ requirements for 2022
collections. 
6 | Introduction
• For community trusts: as above but Year 1 starts with 2021 and the
following years should be amended accordingly.
19. If in-year changes to the minimum software requirements are necessary we
will notify suppliers and NHS providers by email of any such changes and the
reasons for them. We will also publish revised minimum software
requirements document on our website.
Table 1: Proposed timetable for standards implementation across the NHS in
England and publication of updated minimum software requirements
Minimum software
requirements publication date
Sectors Standards expected to be mandatory or
voluntary
February 2019
Acute Mandatory
Ambulance Voluntary
Community Voluntary
Mental health Voluntary
January 2020
Acute Mandatory
Ambulance Mandatory
Mental health Mandatory
Community Voluntary
April 2021 All Mandatory
Scope
20. In this document we consider the software functional requirements only – that
is, the software features relating to loading inputs, software behaviours
(results of an action) and outputs.
21. The minimum software requirements describe the functionality to generate an
output suitable for the National Cost Collection. There should also be the
functionality to enable users to view outputs during processing stages – via 
7 | Introduction
simple windows into the costing system and with outputs from each
designated stage available through CSV. The costing practitioner must be
able to quality assure the final submission by viewing outputs at key
processing stages, as defined through the procurement process and the
system’s ongoing development.
22. The PLICS software should be able to comply with the requirements of the
National Cost Collection (NCC) guidance and technical documentation. We do
not describe here the content of the National Cost Collection – this is covered
in the Approved Costing Guidance, Collection submission files, and
specification, which will be published on our website in March 2022. The
costing process is covered in the costing standards CP1 to CP5. Only the
functions necessary to enable such a process are outlined in Section 2.
23. The non-functional aspects of the software, such as quality or performance,
are not covered in this document.
24. Other aspects we do not cover here include:
• the software design – ie they do not define how the software achieves the
intended result; software suppliers determine the best approach
• software attributes, ie security and reliability
• verification that the costing software complies with the minimum software
requirements – this will be done by the procurement framework process
• server capacity – providers should discuss this with their software supplier.
25. In this document the term ‘system’ does not assume a single application; the
system may comprise separate components. 
8 | Functional requirements
2. Functional requirements
Overview
26. This section describes the system’s functional requirements, grouped
according to area of functionality. These requirements are the system
functions needed for the costing process as defined in the Approved Costing
guidance (standards).
27. The tables in this section list the functional requirements. The ID column links
a particular requirement to a plan of the tests that need to be carried out to
confirm the costing system meets that requirement.
28. To ensure the system covers the entire costing process and incorporates
users’ needs, each requirement has been given a priority ranking:
• MUST: an absolute requirement of the system – software must
demonstrate this capability in the publication year if it is to enable a provider
to implement the applicable standards and costing guidance.
• SHOULD: there may be valid reasons in particular circumstances for
ignoring an item, but the implications must be understood and carefully
weighed before choosing not to implement an item. All the ‘should’
requirements will become ‘must’ requirements in the following year’s
publication of the minimum software requirements. Please note, nothing
qualifies as a ‘should’ this year.
29. Future requirements are outlined in Section 3. These are the functionality
requirements that will be expected of a costing system in 2023.
30. The rationale for each requirement is provided in Table 2. A cross-reference to
the relevant costing standard or worksheet in the technical document is given
where this is helpful. We also refer to the costing principles where relevant.
31. Some requirements include examples of what is expected of the costing
software. Examples are also included in the appendices; but do not form part
of the requirements. 
9 | Functional requirements
System set-up
32. This section concerns the global system settings required to implement the
costing process defined by the costing standards (see Table 2). The cost
model contains the rules defining the costing process, such as allocation
methods, matching rules, data import rules and validation rules.
33. We will publicise the release of published updates to the technical document
on our website and by direct contact with known stakeholders/costing software
suppliers. This ensures that where challenges are resolved, the solutions are
brought into the costing model as soon as possible.
34. A single integrated technical document will be issued in 2022 in line with the
integrated standards for acute, mental health and community services, which
will streamline the number of updates to costing models required.
Table 2: System set-up requirements
ID Requirement description Priority Rationale Changes
for 2022
SYS001 The system must allow multiple
cost models to be set up (with no
restrictions on the number), with
the ability to copy reference data
(the code structures, look-up
tables) and allocation statistics of
existing models to start new
models.
MUST Enables models to be
created to test new
data feeds and
allocation methods, and
to support national and
local cost collections
where necessary.
None
10 | Functional requirements
ID Requirement description Priority Rationale Changes
for 2022
SYS002 The system must allow the user to
choose between a year-to-date
(YTD) cost model and a monthly
cost model, and define the start
and end periods for the model,
where the system only processes
activity and cost/income
information within the parameters
defined.
A reconciliation report must be
produced stating where activity
and/or costs/income are outside
the parameters, indicating which
rows are excluded.
MUST Standard CP2: Clearly
identifying costs
enables the quantum to
be determined using
YTD or in-month costs
and income.
Data and information
principle
Enables activity and
cost/income that are
excluded from the
costing process to be
identified and sense
checked.
None
SYS003 The system must enable the user
to lock a completed cost model, to
prevent amendments after it has
been signed off.
MUST Data and information
principle
For audit, providers
need to keep a copy of
cost models that
contain the rules
underpinning cost
outputs.
None
SYS004 The system must prepopulate cost
models with the costing information
and structures as listed in the
standards.
2
It must include the
relevant feeds and fields in the
information requirements, from the
relevant published version of the
technical document.
This must not be a definitive list, as
the user must be allowed to add
their own user-defined resources,
3
resource groups, matching rules,
MUST Data and information
principle
Greater automation of
data entry reduces the
probability of human
error.
None
2 The resources, activities, collection resources, collection activities, matching rules and allocation
methods where it is practical to update the information without major changes to the system.
3 These local resources as defined in Standard CP2: Clearly identifying costs will then need to be
mapped to the prescribed resources.
11 | Functional requirements
ID Requirement description Priority Rationale Changes
for 2022
cost groups (own-patient care (in
scope and out of scope) and
allocation methods, or to choose
from the prepopulated options.
SYS005 System changes must be tracked,
and the user must be able to query
the changes.
Date and timestamps, triggers and
user profile must be identified.
MUST Data and information
principle
Where manual changes
are required, there
should be a clear log of
where and when the
changes were made.
None
SYS006 Updates to the published technical
document should be uploaded
(where applicable) to the costing
system centrally by the costing
software provider within a
reasonable timeframe, or there
should be functionality for the NHS
organisation to upload the updates
locally. The system should be
updated to the published technical
document each year for the
relevant sector of the NHS
organisation; and any in-year
updates relevant to the costing
collection also adopted.
MUST To ensure consistency
in cost allocation
None
Data import
35. Data import functions prepare the activity data for the costing process, with
the aim of making the loading process transparent and flexible. These also
ensure costing outputs can be traced back to the source data.
36. These requirements outline the functions required to support the import of the
required information (see Table 3), as outlined in the costing standards as well
as providers’ local data feeds.
12 | Functional requirements
Table 3: System data import requirements
ID Requirement description Priority Rationale Changes
for 2022
DAT001 The system must allow
transformational procedures to be
recorded and performed on data
feeds, creating a new version of
the data feed while maintaining
the unedited source files.
The minimum required functions
are:
• date format changes
• text trimming (truncation) to a
user-defined number of
characters
• case setting for text
• concatenation of columns
• pruning of spaces and nonalphanumeric characters
from text
• updating data in columns,
with users able to define the
update values and select the
rules
• ability for users to set up their
own procedures.
MUST Data and information
principle
Data must be in the
correct format for
costing and reporting,
in accordance with
Costing extension:
Managing information
for costing.
4
None
DAT002 The system must be able to
import data from a range of data
sources, using appropriate
mechanisms. Potential data
sources include:
• flat files
• Excel
• XML
• ODBC.
MUST Data and information
principle
Reduces manual data
entry through
automation and
supports the loading
of data feeds.
None
4 Costing extensions can be found at https://www.england.nhs.uk/approved-costing-guidance/
13 | Functional requirements
ID Requirement description Priority Rationale Changes
for 2022
DAT003 The system must allow the user to
load any data feed in accordance
with DAT002, including the
general ledger (GL) and
information requirements, and to
select the fields required for cost
allocation, statistic allocation
tables5 and reporting.
MUST Supports the loading
and costing of data
feeds outside the
scope of the costing
standards.
None
DAT004 The system must allow datasets
(auxiliary, master and standalone)
to be loaded and then excluded
from the costing process based
on user criteria and must
generate a report identifying the
exclusions.
MUST Data and information
principle
Provides transparency
about how activity
data has been used in
the system.
None
DAT005 The system must allow data feeds
to be loaded as a batch process
or individually, depending on the
user’s preference.
MUST Supports the loading
of data feeds in
Standard IR1:
Collecting information
for costing.
None
DAT006 The system must allow automated
data importation to run at
scheduled times as specified by
the user.
MUST Data and information
principle
Accuracy improves
with greater
automation and
limitations on manual
intervention.
None
DAT007 The system must allow whole or
part data feeds to be added,
appended, replaced, or deleted
from the system.
MUST Supports the loading
of data feeds in
Standard IR1:
Collecting information
for costing.
None
5 Relative weight values can be achieved through using statistical allocation tables.
14 | Functional requirements
ID Requirement description Priority Rationale Changes
for 2022
DAT008 The system must allow look-up
tables to be linked to any
imported data using any column
in a data feed, eg look-up test/
resource codes, actual cost or
prices, service line codes, relative
weight values.
MUST Standard CP3:
Allocating costs to
activities.
Supports the
attachment of relative
weight values to data
feeds such as
pathology and
radiology, and the
preparation of data for
costing and reporting.
None
DAT009 The system must be able to cost
incomplete cost objects (eg
admitted patients not discharged
and Emergency Care (EC)
attendances that overlap the end
of a costing period) in the same
way as finished cost objects.
MUST Acute, Mental health
or Community
standard CM3: Nonadmitted patient care;
Standard IR1:
Collecting information
for costing; Standard
CM2: Incomplete
patient events.
Incomplete cost
objects consume
resources and need to
be allocated costs
similarly to finished
cost objects.
None
DAT011 The system must contain a
minimum length of 200 characters
for text fields used as a
description.
MUST Engagement
principle
Supports local and
national reporting
descriptions, to help
stakeholders
understand the
composition of costs.
None
15 | Functional requirements
ID Requirement description Priority Rationale Changes
for 2022
DAT012 The system must allow the user to
load alphanumeric data where
required.
MUST Data and information
principle
Data format in the
same field may
change, eg patient IDs
could contain
alphabetic letters,
numbers or both.
None
DAT013 The system must allow the user to
define local activity groupings for
all activity data feeds as well as
grouping activity into cost groups
(own-patient care – in scope and
out of scope; research and
development; education and
training; other activities;
reconciliation items) and
sensitive/legally restricted data for
the National Cost Collection.
MUST Enables activity and
costs to be grouped
for national and local
reporting.
Addition of
sensitive/le
gally
restricted
data for the
National
Cost
Collection.
DAT014 The system must allow the user to
create proxy cost objects where
cost objects do not exist, to
allocate costs in the same way as
cost objects (eg so ‘a patient’ can
be costed instead of ‘the patient’
for services where patientidentifiable detail is not available).
MUST Standard IR1:
Collecting information
for costing.
Allows all costs to be
allocated within the
system, regardless of
whether activity exists,
eg standalone feeds.
None
DAT015 The system must highlight
dependencies on reference data
to the user before reference data
can be deleted.
MUST Data and information
principle
Raises issues that will
arise in the model if
data is deleted.
None
DAT016 The system should be able to
derive fields from other data items
(such as length of stay from start
and end points). These data items
can be nationally or locally
defined.
MUST To ensure system
resilience and
robustness.
None
16 | Functional requirements
Activity matching
37. Matching auxiliary feeds to the correct cost object is important in generating
high quality cost information. The matching process is described in the costing
standards, with matching rules defined for auxiliary feeds.
38. This section outlines the activity-matching functions required from the system
(see Table 4). It should also have in-built flexibility to allow users to create
local rules to produce more accurate matches and to apply the rules outlined
in the standards.
Table 4: System activity-matching requirements
ID Requirement description Priority Rationale Changes
for 2022
MAT001 When activity data is matched
outside the system, the system
must allow a matching key and a
matching rule ID to be included in
the activity load. It must generate
a report that states the number of
records with and without a
matching key as an absolute
value and as a percentage.
MUST Data and information
principle
Matching may take place
outside costing systems,
but it is imperative that
the results are checked
and understood by
costing practitioners
working in the system
and as part of the costing
process.
None
MAT002 The system must allow the user
to create matching rules and
automate the process of matching
activities to cost objects, eg
patient episode, programme or
incident.
MUST Data and information
principles
Minimises errors through
automation.
None
17 | Functional requirements
ID Requirement description Priority Rationale Changes
for 2022
MAT003 The system must allow the user
to select any combination of
columns from a data feed to
determine a match to a cost
object, eg cost object identifier,
consultant, specialty, location and
date.
User-defined matching rules must
not contain a matching rule ID
that is similar to the matching rule
IDs in the costing standards.
MUST The costing standards do
not cover all the data
feeds that providers may
use for costing. Users
need to be able to set up
their own matching rules
for data feeds outside
the scope of the
standards.
None
MAT004 The system must allow a
matching hierarchy to be set and
amended by the user for each
auxiliary feed, with no restrictions
on the number of levels: eg set
the activities to match to patients
in the order of the dataset;
6
this
should include master datasets
from all sectors.
MUST Standard CP4: Matching
costed activities to
patients.
The matching hierarchy
improves the chance of
obtaining an accurate
match by matching to the
most appropriate feed
first.
None
MAT005 The system must allow the user
to alter the matching date range
for each matching rule, ie number
of days/hours either side of the
activity date.
MUST Supports the date
formats in Spreadsheet
IR1.2: Patient-level field
requirements for costing
in the costing standards
technical document and
allows the user to
determine their own
range.
None
6 Urgent care (emergency department/minor injuries unit/walk-in centre), admitted patient care, nonadmitted patient care and then other master datasets in the order they are shown on the
matching hierarchy.
18 | Functional requirements
ID Requirement description Priority Rationale Changes
for 2022
MAT006 The user must be able to change
the combination and order of
fields used for each matching
rule: eg line 1 location, line 2
location and consultant, and line 3
consultant, requesting specialty
and location.
MUST Spreadsheet CP4.1:
Matching rules in the
costing standards
technical document.
Auxiliary feeds have
different matching rules;
the combination of fields
differs for each rule.
None
MAT007 The system must be able to deal
with unmatched activity by
allowing the options:
• separately cost from
matched activity and apply
user-defined allocation
methods to allocate to cost
objects
• report costs as a
reconciliation item either
under the requesting
department or the providing
department (see Appendix 1
for example)
• allocate unmatched costs
across matched activities
only.
MUST Supports the treatment
of unmatched activities
identified in Standard
CP4: Matching costed
activities to patients.
None
MAT008 The system must be able to
create a matching rule ID for all
activity records in auxiliary feeds.
MUST Data and information
principle
Traces the matching
process from the
auxiliary feed to the cost
object.
None
19 | Functional requirements
ID Requirement description Priority Rationale Changes
for 2022
MAT009 The system must generate a
summary report containing the
rule ID, number of records
matched and unmatched as a
percentage of total number of
records and absolute value for all
auxiliary feeds.
MUST Data and information
principle
Makes it possible to
identify and validate
matching results for
auxiliary feeds.
None
MAT010 The system must allow the user
to build unlikely matches into the
matching rules.
MUST Supports unlikely
scenarios covered in
Standard CP4: Matching
costed activities to
patients, to minimise the
risk of activity matching
incorrectly to cost
objects.
None
MAT011 The system must allow the user
to determine data feeds as
master, auxiliary, supplementary
or standalone feeds.
MUST Determines which data
feeds require matching
rules and which contain
cost objects, in
accordance with
Standard CP4: Matching
costed activities to
patients.
None
MAT012 The system must allow data feeds
to be matched using data that has
a start and finish date and time
format, eg ‘CCYY/MM/DD
hh:mm’.
The system must also allow time
values to be used in allocation
methods.
MUST Supports the time and
date formats in the
Spreadsheet IR1.2: Field
requirements in the
costing standards
technical document.
None
MAT013 The system must allow cost
objects from auxiliary feeds to be
allocated resources and activities
as part of the costing process and
matched to master feeds or other
auxiliary feeds for reporting.
MUST To support the critical
care allocation method in
the costing standards.
None
20 | Functional requirements
Import data validation
39. Data validations capture problems with data quality that can cause errors in
the final outputs or processing issues in the cost model. The aim of the
requirements in this section (see Table 5) is to detect data-loading errors at
the earliest opportunity and to feed them back to the providers of the source
data for review before costs are distributed to final cost objects.
Data validation tool
40. Before submitting patient-level files for the National Cost Collection, it is vital
that providers pass them through the data validation tool (DVT).
41. The DVT assesses the quality of the files before submission to NHS Digital to
minimise the chance of submission failure and the need for resubmissions.
42. The tool checks the files are in the correct format for submission, mandatory
fields are populated, and valid codes have been used in fields where
applicable. It produces an output file setting out any discrepancies in the
output to the file specification that need to be amended before submission.
43. Software suppliers and NHS providers may create CSV or XML files.
Regardless of whether CSV or XML files are produced, providers should
validate their files using the DVT before submission. The DVT will convert
CSV files into XML, which is the file format NHS Digital requires for PLICS
submissions.
44. For non-acute services, validation checks that would result in a submission
failure are to be restricted to file structures, field formats, population of
mandatory fields and ensuring valid codes have been used where applicable.
Blank fields will be accepted for non-mandatory fields, however trusts should
try to complete as many fields as possible.
21 | Functional requirements
Table 5: System data validation requirements
ID Requirement description Priority Rationale Changes
for 2022
IMP001 The system must allow the user to set
data validations on any activity data
loaded.
Validations required as a minimum:
7
• data missing from mandatory
fields
• incorrect data types in fields, eg
text in a date column
• negative quantities in the data
• duplicate data
• inconsistent values.
See Appendix 2 for examples of other
data validations the user may need to
set.
MUST Facilitates the threestep quality check in
Costing extension:
Managing information
for costing.
None
IMP002 The system must allow users to set
the importance of data validations
using three levels of severity:
• import will fail – level 1
• system flags error as
important but import will still load
– level 2
• reports a minor error – level 3.
See Appendix 2 for examples.
MUST Differentiates
validation errors, so
the system can still
process if levels 2 or 3
are present: eg if a
field is needed for
reporting but not for
the costing process,
the data will still load.
None
IMP003 The system must produce data
validation reports that state where and
why errors are occurring, and these
must be in formats that can be
exported to the source departments
for review before costs are allocated
to activities.
MUST Facilitates data
cleansing as part of
the three-step quality
check in Costing
extension: Managing
information for
costing.
None
7 Please refer to the latest data validation tool: https://www.england.nhs.uk/approved-costingguidance/
22 | Functional requirements
ID Requirement description Priority Rationale Changes
for 2022
IMP004 The system must validate activity on
loading and after any transformation
by generating an error log.
MUST Facilitates the threestep quality check in
Costing extension:
Managing information
for costing.
None
IMP005 The system must generate a control
report when data feeds are imported,
stating the number of records present,
the number of records excluded, and
the number of records loaded for the
costing process.
The system must also reconcile the
records loaded to master feeds and
standalone feeds to the number of
cost objects reported in output tables.
MUST Data and
information principle
Traces activity from
source to cost objects.
None
IMP006 The system must generate a control
report which allows the user to
compare the count of records for all
data feeds by day/week/month/quarter
for a financial year.
MUST Standard IR1:
Collecting information
for costing.
Supports the sense
checking of the
activity load.
None
IMP007 The system must flag new cost
centres and expense codes as part of
the GL load.
MUST Data and
information principle
Increases automation
to minimise the risk of
cost centres not being
mapped to the correct
resource activity and
allocation method in
the costing process.
None
23 | Functional requirements
Cost ledger
45. Method 2 general ledger to cost ledger (GL to CL) mapping allows the user to
map costs to ensure they are all in the right starting position with the right
label to begin the costing process. To implement our preferred method, Table
6 lists the system cost ledger requirements to make cost categorisation
consistent and give users the flexibility to refine, develop and add to the cost
information in the cost model using either mapping method 1, method 2 or a
combination of both.
46. The functions required to support the cost allocation methods outlined in the
costing standards are also described. This section supports Standard CP1:
Ensuring the correct cost quantum and Standard CP2: Clearly identifying
costs. If your provider opts to facilitate method 2, see Appendix 3 for the
costing process diagram extract from the costing standards.
Table 6: System cost ledger requirements
ID Requirement description Priority Rationale Changes
for 2022
COS001 The system must apply the costing
process as defined by the costing
standards in four stages:
• Stage 1 maps the costs in a
provider’s GL to the CL as defined
in the Costing glossary in the
Approved Costing Guidance.
• Stage 2 uses the CL to identify the
prescribed resource codes to be
used.
• Stage 3 assigns resource costs to
the activities that use those
particular resources, using Step 1
of the cost allocation method
process (see Spreadsheet CP3.3).
• Stage 4 matches activities to the
cost objects they relate to, using
Step 2 of the cost allocation
method process (see Spreadsheet
CP3.3).
MUST Facilitates the
costing approach
outlined in Standard
CP2: Clearly
identifying costs and
Standard CP3:
Allocating costs to
activities.
None
24 | Functional requirements
ID Requirement description Priority Rationale Changes
for 2022
COS002 The system must be able to classify
the costs in the GL into:
• patient-facing resources and
resource groups (including
collection resources)
• overheads a minimum of five userdefined groups.
MUST Enables the
mapping of expense
codes to the
classifications
outlined in the
costing standards,
as well as
supporting local cost
groupings.
Type 2
support cost
classificatio
n has been
removed
from the
costing
standards.
COS003 The system must be able to
disaggregate expense codes where
there are several cost items on one
line that should map to different
resources in the CL, as they have
different allocation methods or require
different information sources.
MUST Supports the
disaggregation of
costs outlined in
Standard CP2:
Clearly identifying
costs.
None
COS004 The system must allow costs to be
transferred between both cost centres
and expense codes, with the option to
use information from statistic allocation
tables8
(such as headcount) and other
relative weight values with
percentages and absolute values as
the basis for this.
MUST Ensures costs are in
the correct starting
position for costing:
costs may need to
be transferred as
outlined in Standard
CP2: Clearly
identifiable costs.
None
COS005 The system must include fields for
• GL cost centre
• GL expense code
• CL cost centre
• CL expense code
• amount (cost value)
• period (ie month)
• patient-facing/support cost
classification
• patient-facing/support resource
code
MUST Standard CP1:
Ensuring the correct
cost quantum and
Standard CP2:
Clearly identifying
costs.
Supports the loading
of the GL into the CL
and its processing.
None
8 Relative weight values can be achieved through using statistical allocation tables.
25 | Functional requirements
ID Requirement description Priority Rationale Changes
for 2022
• patient-facing/support resource
description
• overheads code
• overheads description
• resource group (collection
resource) code
• cost classification (fixed/semifixed/variable, marked as F/SF/V
in accordance with Spreadsheet CP2.1
in the costing standards technical
document.
COS006 The system must be able to aggregate
expense codes to produce a new
division of costs.
MUST Supports the
aggregation of costs
outlined in Standard
CP2: Clearly
identifying costs.
None
COS007 The system must allocate overheads
using a reciprocal allocation method;
see Standard CP2: Clearly identifiable
costs for more information.
MUST Achieves the
overheads allocation
method in Standard
CP2: Clearly
identifying costs.
None
COS008 The system must allow the user to
exclude GL lines from the costing
process, eg to allow internal recharges
that net off to be removed from the
cost process.
MUST Supports the
treatment of
recharges outlined in
Standard CP1:
Ensuring the correct
cost quantum and
Standard CP2:
Clearly identifying
costs.
None
26 | Functional requirements
ID Requirement description Priority Rationale Changes
for 2022
COS009 The system must allow the
reconciliation codes from the technical
document to be input, enabling the
user to create the costing quantum
from the annual accounts to the final
audited accounts.
MUST This is to support the
construction of the
collection
reconciliation.
None
COS010 The system must allow the user to
view their complete CL, which will have
been created through their mapping of
the GL to the standardised CL in
Spreadsheet CP2.1 in the costing
standards technical document.
This will include the values resulting
from the mapping of the standardised
cost centres and expense codes to
resources as well as any new codes
that result from disaggregating costs in
the costing system.
The standardised CL codes should
form part of the system set-up in
requirement SYS004.
MUST Standard CP2:
Clearly identifying
costs.
This is to support the
cost classification
process in the
costing standards.
None
COS011 The system must be able to classify
costs as per the CL into:
• fixed
• semi-fixed
• variable.
MUST Enables the
mapping of expense
codes to the cost
classifications
outlined in the
costing standards.
None
Statistic allocation tables, relative weight values and
allocation methods
47. This section describes the requirements that ensure the costing system can
apply the cost allocation methods defined in the costing standards and
support a consistent approach to costing across organisations (see Table 7). 9
9 Relative weight values can be achieved through using statistical allocation tables.
27 | Functional requirements
Table 7: Required statistic allocation tables and allocation methods
ID Requirement description Priority Rationale Changes
for 2022
ALL001 The system must allow the user to
create automated allocation
methods from data feeds, using
any field in the data feed and userdefined data filters, which link the
activity to individual cost objects.
MUST Supports the
allocation of
resources to
activities using the
prescribed methods
and the setting-up of
local allocation rules.
None
ALL002 For apportionment of overheads,
the system must create automated
statistic allocation tables and other
relative weight values based on GL
values and feed data/cost objects,
and allow the user to select the
records to be used: eg create
statistic tables such as budgeted
headcount or actual costs by
specific cost centres and periods.
MUST Supports the
allocation of
overheads through
statistic allocation
tables as outlined in
Standard CP2:
Clearly identifying
costs.
None
ALL003 The system must allocate
overheads – once all costs have
been disaggregated from the GL to
the CL – to cost centres (that are
directly attributable to cost
objects), classified as patientfacing. This should be done using
statistic allocation tables (and other
relative weight values) and
reciprocal costing.
MUST Supports the
allocation of
overheads through
statistic allocation
tables as outlined in
Standard CP2:
Clearly identifying
costs.
None
ALL004 The system should allow
overheads within patient-facing
cost centres to be allocated to any
resource or expense code (directly
attributable to cost objects)
classified as patient-facing using
the allocation methods in CP2.2 of
the technical document.
MUST Supports the
allocation of
overheads to create
fully absorbed
resources.
None
28 | Functional requirements
ID Requirement description Priority Rationale Changes
for 2022
ALL005 The system must allow multiple
activity trim points to be used to
determine the days that are inlier
and outlier, and associate income
and costs.
MUST Supports the local
calculation of excess
bed days for
reference costs and
the comparison of
activity and cost
before and after trim
points.
None
ALL006 The user must be able to use
actual cost or income as a
weighting to allocate resources or
income.
MUST Supports the
allocation of
traceable costs in
Standard CP3:
Allocating costs to
activities.
None
ALL007 Where actual cost or income is
used as a weighting to allocate
resources or income, the user
must be able to report the actual
cost/income and any variance from
the associated ledger value
separately in a report.
MUST Supports the
allocation of
traceable costs in
Standard CP3:
Allocating costs to
activities.
None
ALL008 The system must allow the user to
select any field from a data feed or
look-up table to include in the
allocation of income/costs to cost
objects.
MUST Facilitates Standard
CP3: Allocating
costs to activities.
None
ALL011 The system must allow
used/unused minutes to be
determined from data feeds and
used to generate allocation
methods, eg the allocation of
unused time in theatres.
MUST Supports the costing
of unused time.
None
ALL012 The system must allocate all costs
using a minimum of four decimal
places.
MUST Supports the
consistent allocation
of costs.
None
29 | Functional requirements
ID Requirement description Priority Rationale Changes
for 2022
ALL013 The system must automate the
allocation of resources to activities
by using data feeds and other
information sources to create the
percentages/
weightings.
MUST Supports the
allocation of
resources to
activities as outlined
in Standard CP3:
Allocating costs to
activities.
None
ALL014 The system must allow users to
allocate patient-facing and support
resources (either fully absorbed
with overheads or not) to activities
using the prescribed methods in
Spreadsheet CP3.3 in the
technical document.
MUST Supports the
allocation of costs as
outlined in Standard
CP2: Clearly
identifying costs and
Standard CP3:
Allocating costs to
activities.
None
ALL015 The system must allow users to
match costed activities to patients
using the prescribed allocation
methods in the Spreadsheet
CP3.3 in the technical document.
MUST Supports the
allocation of
activities to patients
as outlined in
Standard CP3:
Allocating costs to
activities.
None
ALL016 The system must allow users to
allocate costs using data feeds,
either weighted using actual time
or cost, or relative weight values
determined by the user.
MUST Supports the
allocation of costs to
activities in Standard
CP3: Allocating
costs to activities
and matching of
those activities or
actual costs to the
correct patient.
None
ALL017 The system must allow users to
allocate costs to cost objects
using a combination of allocation
rules and matching rules from
data feeds.
MUST Supports the
allocation of costs to
patients in Standard
CP4: Matching
costed activities to
patients.
None
30 | Functional requirements
ID Requirement description Priority Rationale Changes
for 2022
ALL018 The system must be able to use
derived fields (as in DAT016) to
allocate cost.
MUST To ensure system
resilience and
robustness.
None
Cost validation
48. This section includes requirements that ensure the information in the costing
system is fully reconcilable with the organisation’s financial performance as
reported in the GL and financial statements (see Table 8). The validations are
also essential if costing practitioners are to see where and why the cost model
does not reconcile, or where costs are allocated incorrectly.
49. Each of the system cost validation requirements below should be exportable
as a report. They should be easy to interrogate and pose no need to crossreference (eg by VLOOKUP) to evaluate the underlying data.
Table 8: System cost validation requirements
ID Requirement description Priority Rationale Changes for
2022
VAL001 The system must produce a
reconciliation between the GL
(cost centre and expense
code) and the fully absorbed
cost objects.
The reconciliation must show
clearly which GL lines have
been absorbed by the cost
objects.
MUST Supports the production
of a full cost
reconciliation as
outlined in Standard
CP5: Reconciliation.
None
31 | Functional requirements
ID Requirement description Priority Rationale Changes for
2022
See Standard CP5:
Reconciliation.
VAL002 The system must produce a
report identifying CL lines that
have no basis for allocation
and are a reconciling item,
before resources are
allocated to activities.
MUST Ensures all ledger lines
have been mapped to a
cost object.
None
VAL003 The system must generate a
validation report showing
allocation methods that
contain no activity records,
before costs are allocated to
activities.
MUST Identifies allocation
methods with no
records, linked to
income and cost values,
before processing as
there will be no cost
objects to allocate the
values to.
None
VAL004 The system must contain a
report identifying the record
count and the volume
amounts for each allocation
method.
MUST Enables costs and
activity to be traced to
final cost object.
None
VAL005 The system must validate the
data to be submitted to the
national collection using the
validation rules included in
the NHSEI DVT; highlighting
any collection validation
issues.
MUST Supports the national
patient-level collection.
None
VAL006 The system must allow the
National Cost Collection
(PLICS and aggregated data)
to be produced using the
same cost model.
MUST Supports the
reconciliation of patientlevel costs and
aggregated costs for
the National Cost
Collection.
None
32 | Functional requirements
ID Requirement description Priority Rationale Changes for
2022
VAL007 The system must allow
validation of patient records
that are proxy cost objects
(as in DAT014) for the
anonymised records held
within the system, where
either no patient record was
available or where the
information governance
regulations prevented a
patient record being used in
the costing system.
MUST Standard IR1:
Collecting information
for costing.
None
System reports and transparency
50. Transparency applies to all aspects of the costing system, from imported
activity data to the traceability of cost allocations and cost adjustments. It is an
essential aspect of the system as it assures the user that the intended result
of an action has occurred. This section covers the requirements that give the
costing process its necessary transparency, focusing mainly on reports that
should be available after calculation of the costing model (see Table 9). 10
Table 9: System reports and transparency requirements
ID Requirement description Priority Rationale Changes
for 2022
REP001 The system must allow the user to
trace the costing process from both
the GL (cost centre and expense
code) and the cost object.
To be actioned in conjunction with
REP028, whereas the costing
system must allow ‘windows’ into
the system with capability to export
results into easily interrogated
formats such as Excel/CSV.
MUST Data and
information principle
Allows the costing
process to be followed
from either the start
point (GL) or end
point (cost object).
None
10 See Standard CP5: Reconciliation, for a full list of system reports.
33 | Functional requirements
ID Requirement description Priority Rationale Changes
for 2022
REP002 The user must be able to select any
fields associated with master,
standalone and auxiliary feeds to
create reports that present the
income, costs and count of cost
objects in different ways, eg by clinic
code, date, site, consultant, service,
location, local activity groupings.
MUST Supports local
reporting and data
validation.
None
REP003 The system must allow the fully
absorbed cost objects to be
compared to previous years’
currency averages (mean, median
and mode) for sense checking and
outlier identification. It must be
possible to adjust the previous
year’s currency using the provider’s
market forces factor and/or the
inflation rate.
MUST Supports local
comparison with
peers and data
validation.
None
REP004 The system must show how each
cost centre and expense code
combination is allocated in the
model.
MUST Data and
Information principle
Traces costs from the
GL.
None
REP005 The system must show how costs
have moved from their starting
position in the GL to the CL.
MUST Data and
information principle
Traces costs from the
GL to the CL.
None
REP006 The system must enable the user to
view all fields from a data feed and
select records to be viewed.
MUST Supports local
reporting and data
validation.
None
34 | Functional requirements
ID Requirement description Priority Rationale Changes
for 2022
REP007 The system must allow overheads
to be traced from the originating
cost centre to the cost object, and
from the cost object to the
originating cost centre.
The system must be able to show all
the cost centres that the overheads
have been allocated to, giving the
amount and the allocation method
used to allocate the costs to cost
objects.
MUST Data and
information principle
Traces support cost to
the final cost object.
None
REP008 The system must produce a report
of cost objects’ income and costs by
cost groups (own-patient care; ownpatient care out of scope; research;
education and training; other
activities; reconciliation).
MUST Data and
Information principle
Allows the total
reported costs to be
reconciled to the
audited accounts or
board report.
None
REP009 The system must allow the user to
view the cost/income values, activity
counts and descriptions of each
individual resource and activity
assigned to a cost object.
MUST Supports local
reporting and data
validation.
None
REP010 The system must allow the user to
isolate a cost at any stage in the
system and identify where it has
come from or been allocated to.
MUST Data and
information principle
Identifies how costs
have been allocated
in the model.
None
35 | Functional requirements
ID Requirement description Priority Rationale Changes
for 2022
REP011 The system must allow the user to
produce reports using cost object
attributes (eg currency, clinic code
and consultant), stating the average
(mean, median and mode) unit
costs/income for each combination
of resource and activity, as well as
the averages at a resource group
and an activity group level.
MUST Supports local
reporting and data
validation.
None
REP012 The system must allow the CL and
income ledgers in any two costing
models within the same software
system to be compared, to identify
the percentage change in costs and
income by cost centre and expense
code.
MUST Supports local
reporting and data
validation.
None
REP013 The system must allow users to
report and compare cost objects
across a minimum of three financial
years where data is available.
11
MUST Supports local
reporting and data
validation.
None
REP014 The system must produce a report
outlining the allocated costs/income
and relative weight values for
activity data.
MUST Supports local
reporting and data
validation.
None
REP015 Revised data feeds and costed
outputs must be accessible in one of
the following formats for local
reporting solutions:
• flat files
• Excel
• ODBC
• XML.
MUST Supports local
reporting.
None
11 For example, where a new supplier has been adopted using different methods, or the CTP is run
for the first time, we understand comparable data will not be available.
36 | Functional requirements
ID Requirement description Priority Rationale Changes
for 2022
REP016 The system must produce the
National Cost Collection outputs in
CSV or XML format in accordance
with the cost collection guidance for
the year and sector of the collection.
See the Approved Costing
Guidance for details of the field
values used.
MUST Supports the CTP
cost collection
process.
None
REP017 The system must produce a report
of all reconciling items created,
reporting the description, activity
count and cost/income value.
MUST Data and
information principle
Validates reconciling
items that are created.
None
REP018 The system must produce output
tables for national mandatory cost
collections.
MUST Supports the
production of
mandatory cost
collections.
None
REP019 The system must report cost objects
by originating cost centre, expense
code, patient-facing resources,
organisation or department support
resources and amount (cost or
income).
MUST Data and
information principle
Traces costs from the
GL to the cost object.
None
REP020 The system must allow the user to
filter an activity and see a
breakdown of costs by all the
associated resources and cost
objects.
MUST Data and
information
principle
Traces costs from the
activity back to
resources and cost
objects.
None
REP021 The system must allow the user to
filter a resource and see a
breakdown of costs by all the
associated activities and cost
objects.
MUST Data and
information principle
Traces costs from the
resource to activity
and cost objects.
None
37 | Functional requirements
ID Requirement description Priority Rationale Changes
for 2022
REP022 Where monthly cost models are
created, the system must be able to
group cost models together for YTD
reporting.
MUST YTD and monthly
costing are covered in
Standard CP2: Clearly
identifying costs.
Therefore, the system
must facilitate both.
None
REP023 The system must allow the
prescribed patient-facing and
support resources to be reported at
the cost object level, both:
• including the overheads
absorbed by the resources
• excluding the overheads
absorbed by the resources
MUST Supports the local and
national reporting of
patient-facing and
support costs.
None
REP024 The system must produce a
reconciliation report between the
collection output files and the
calculated cost model.
MUST Collection
reconciliation.
None
REP025 The system must produce reports
that contain the valid values and
format required for the population
of the costing assessment tool
(CAT) supplementary sheets. See
the CAT12 for report format.
MUST Facilitates the
completion of the
CAT.
None
REP026 The system must allow collection
outputs to be reviewed by cost
object, specialty, data feed,
activity count and total costs as a
minimum, with the ability to export
the report for review and sign-off.
MUST To support the
executive sign-off of
the cost collection
extracts.
None
12 https://www.openlearning.com/nhs/courses/costing-improvement/costing-assessment-tool202021/?cl=1
38 | Functional requirements
ID Requirement description Priority Rationale Changes
for 2022
REP027 The system must allow the
reporting of incomplete episodes
across cost periods in accordance
with the National Cost Collection
guidance and the costing
standards.
MUST To support the cost
and reporting of
incomplete episodes.
Standard CM2:
Incomplete patient
events.
None
REP028 The system must allow ‘windows’
into the system at several points in
the costing process and export
into easily interrogated formats
such as Excel/CSV. This should
include reports at GL, CL,
resources after allocation,
activities after matching, and cost
object (patient)-level costs. The
patient-level report may be
aggregated.
MUST To support the
continuous
interrogation and
executive sign-off of
the cost collection
extracts.
None
Income ledger
51. The income ledger allows users to move income to the correct starting
position for the income allocation process. The aim of the requirements in this
section (see Table 10) is to ensure consistency of the treatment of income
information and give users the flexibility to refine, develop and add to the
income information reported in the costing model. These requirements are a
must priority to facilitate the local reporting of income and costs required by
end users.
Table 10: Income ledger requirements
39 | Functional requirements
ID Requirement description Priority Rationale Changes
for 2022
INC001 The system must allow patient-facing or
total costs per cost object to be used in
user-defined allocation methods to
allocate income to the appropriate cost
objects, eg allocate income to all
admitted patient care episodes using
total costs as a weight.
MUST Facilitates income
allocations
None
INC002 The system must be able to
disaggregate records in the income
feed where there are several income
types on one line and to apply different
user-defined cost drivers and income
classifications.
MUST Supports the allocation
of income using an
income feed; the
income may need to be
broken down further
before it can be
allocated.
None
INC003 All the requirements outlined in Table 5,
except COS007, must also apply to the
income ledger: the term ‘cost’ is
replaced by ‘income’ and the term
‘resource’ is replaced by ‘income
classification’.
MUST Income needs to be
allocated to cost
objects in a similar way
to costs. See Standard
CM35: E&T
Transitional method for
netting off E&T income
for the National Cost
Collection.
None
INC004 The system must allow income to be
mapped to resources to enable it to be
netted off against costs, eg:
• clinical excellence awards
income
• when income is received for part
of a clinician’s salary for treating
patients at another provider
• education and training income
• other operating income.
MUST Supports the treatment
of external recharges in
Standard CP2: Clearly
identifying costs.
None
Education and training
52. The aim of the requirements in this section (Table 11 below) is to give
consistency to the treatment of education and training (E&T) cost and income 
40 | Functional requirements
in the costing process. This will also support the integration of E&T into a
patient-level costs collection process.
53. All requirements in the preceding sections apply when costing E&T cost
objects. However, the requirements outlined in this section only apply to the
costing of E&T activity within the costing system.
Table 11: E&T requirements
ID Requirement description Priority Rationale Changes
for 2022
E&T001 The system must allocate within one
costing model the costs to cost objects of:
• patient care
• E&T.
MUST Facilitates the
integration of E&T
costing into the
costing system.
None
E&T002 The system must allow the user to split
patient-facing (staff) resources into patient
care and E&T activities.
MUST Facilitates the
integration of E&T
costing into the
costing system.
None
E&T003 The system must allow users to choose
between removing E&T costs from cost
centre/expense codes and netting off E&T
income from cost centre/expense codes.
The user should be able to apply the same
weightings for both methods.
MUST This is to support
the development of
a flexible E&T
allocation process
which can either
net E&T income off
patient care costs
or remove E&T
costs. See
Standard CM35:
E&T: Transitional
method for the
treatment of
income and
expenditure.
None
41 | Future requirements
3. Future requirements
54. The 2023 version of the minimum software requirements will include
requirements to support the single integrated cost collection. This is where
acute, ambulance, mental health and community patient-level cost collections
are integrated to produce one single cost collection submission process for
providers of these services where a PLICS XML feed exists.
55. It may include elements to integrate the collection of education and training
costs in the document.
56. It may also include elements to increase the frequency of the collections after
the process for understanding if quarterly collections are feasible. The process
will include a full discovery phrase including all stakeholders which will then be
followed by a full consultation and mandating process.
4. Test plan
57. The test plan13 gives software suppliers and providers of NHS services a
means to assess their system’s ability to support the costing process and the
requirements.
58. The plan includes numerous test scenarios to assess the functionality of the
costing software.
13 Available to download at https://www.england.nhs.uk/approved-costing-guidance/
42 | Appendix 1: Unmatched activity
Appendix 1: Unmatched
activity
There will inevitably be activities that do not match to cost objects because of, for
example, timing differences or data quality issues. If, for example, a pathology test
in an acute service does not match to a patient episode, the system needs to treat
the data as follows:
• If the specialty that ordered the test is known but it cannot be matched to
the patient, the system must allow the cost to be reported under the
requesting specialty and labelled as a reconciling item.
• If the specialty that ordered the test cannot be identified, the system must
allow the cost to be reported under the pathology department and labelled
as a reconciling item.
• If additional information available to the costing practitioner can be used to
allocate the cost to specific groups of patients – eg all patients with the
same location or consultant – the system must enable this.
43 | Appendix 2: Data validation scenarios
Appendix 2: Data validation
scenarios
The scenarios below are not an exhaustive list – they merely give an indication of
the many validations we would expect to take place to ensure data quality.
Data validations should be classified according to these levels of severity:
• level 1 – import into the costing system will fail
• level 2 – system flags the error as important, but the import will still load
• level 3 – reports a minor error.
Table A2.1: System data validation examples14
Severity Field name Rule name
1 Anonymised local
patient ID
Patient ID column value is blank
1 Anonymised local
patient ID
Patient ID column value exceeds the threshold for the number of
permitted special characters (eg ! £ & *), which is three
1 Spell ID Spell ID column value is blank
1 Spell ID Spell ID column value exceeds the threshold for the number of
permitted special characters (eg ! £ & *), which is three
1 Spell ID Unique spell ID has been recorded for each episode
Ensure that spells are reported correctly
1 Episode ID Episode ID column value is blank
1 Episode ID Episode ID column value exceeds the threshold for the number of
permitted special characters (eg ! £ & *), which is three
1 Episode ID Episode ID column contains duplicate values
1 Episode type Episode type contains blanks or values other than numeric 01, 02,
03, 04
2 Episode start date
and time
Episode start date and time column value is blank
14 Sector-specific data validations are available on the specifications page of our website:
https://www.england.nhs.uk/approved-costing-guidance/
44 | Appendix 2: Data validation scenarios
Severity Field name Rule name
2 Episode start date
and time
Episode start date and time column value is not reported in correct
format, within range
Follow ‘CCYY-MM-DD hh:mm’ format
Enter a date/time between 2020-05-01 00:00 and 2020-09-01
23:59
2 Episode end date
and time
Episode end date and time column value is blank
2 Episode end date
and time
Episode end date and time column value is not reported in correct
format, within range
Follow ‘CCYY-MM-DD hh:mm’ format
Enter a date/time between 2020-05-01 00:00 and 2020-09-01
23:59
2 Episode start date
and time, episode
end date and time
Episode end date is before episode start date
2 Admission date
and time
Admission date and time column value is blank
2 Admission date
and time
Admission date and time column value is not reported in correct
format, within range
Follow ‘CCYY-MM-DD hh:mm’ format
Enter a date/time between 2020-05-01 00:00 and 2020-09-01
23:59
2 Admission date
and time, episode
start date and time
Admission date and time column is on or after 01/04/2021 and
does not match the first episode's start date within the spell
2 Discharge date and
time
Discharge date and time column value is blank
2 Discharge date and
time
Discharge date and time column value is not reported in correct
format, within range
Follow ‘CCYY-MM-DD hh:mm’ format
Enter a date/time between 2020-05-01 00:00 and 2020-09-01
23:59
2 Admission date
and time,
discharge date and
time
Discharge date and time is before admission date and time column
2 Discharge date and
time, episode end
date and time
Discharge date and time does not match the last episode’s end
date within the spell
45 | Appendix 2: Data validation scenarios
Severity Field name Rule name
2 Admission method
code
Admission method code column value is blank
2 Admission method
code
Invalid value(s) entered in admission method code column
2 Discharge method
code
Discharge method code column value is blank
2 Discharge method
code
Invalid value(s) entered in discharge method code column
3 Discharge
destination code
Discharge destination code column value is blank
3 Discharge
destination code
Invalid value(s) entered in discharge destination code column
3 Patient gender Patient gender column value is blank
3 Patient gender Invalid value(s) entered in patient gender column
2 Treatment function
code
Treatment function code column value is blank
2 Treatment function
code
Invalid value(s) entered in treatment function code column
2 Patient
classification
Patient classification column value is blank
2 Patient
classification
Invalid value(s) entered in patient classification column
2 FCE HRG (RC) FCE HRG (RC) column value is blank
2 FCE HRG (RC) Invalid value(s) entered in FCE HRG (RC) column
2 Spell HRG (RC) Spell HRG (RC) column value is blank
2 Spell HRG (RC) Invalid value(s) entered in Spell HRG (RC) column
3 Patient age Patient age column value is blank
3 Patient age Invalid value(s) entered in patient age column
2 OPCS 1 Invalid value(s) entered in OPCS 1 column
2 OPCS 2 Invalid value(s) entered in OPCS 2 column
2 OPCS 3 Invalid value(s) entered in OPCS 3 column
2 OPCS 4 Invalid value(s) entered in OPCS 4 column
2 OPCS 5 Invalid value(s) entered in OPCS 5 column
2 OPCS 6 Invalid value(s) entered in OPCS 6 column
2 OPCS 7 Invalid value(s) entered in OPCS 7 column
2 OPCS 8 Invalid value(s) entered in OPCS 8 column
2 OPCS 9 Invalid value(s) entered in OPCS 9 column
46 | Appendix 2: Data validation scenarios
Severity Field name Rule name
2 OPCS 10 Invalid value(s) entered in OPCS 10 column
2 OPCS 11 Invalid value(s) entered in OPCS 11 column
2 OPCS 12 Invalid value(s) entered in OPCS 12 column
2 ICD10 1 ICD10 1 column value is blank
2 ICD10 1 Invalid value(s) entered in ICD10 1 column
2 ICD10 2 Invalid value(s) entered in ICD10 2 column
2 ICD10 3 Invalid value(s) entered in ICD10 3 column
2 ICD10 4 Invalid value(s) entered in ICD10 4 column
2 ICD10 5 Invalid value(s) entered in ICD10 5 column
2 ICD10 6 Invalid value(s) entered in ICD10 6 column
2 ICD10 7 Invalid value(s) entered in ICD10 7 column
2 ICD10 8 Invalid value(s) entered in ICD10 8 column
2 ICD10 9 Invalid value(s) entered in ICD10 9 column
2 ICD10 10 Invalid value(s) entered in ICD10 10 column
2 ICD10 11 Invalid value(s) entered in ICD10 11 column
2 ICD10 12 Invalid value(s) entered in ICD10 12 column
2 ICD10 13 Invalid value(s) entered in ICD10 13 column
2 Consultant code Consultant code is blank
47 | > Appendix 3: Costing process diagram*
Appendix 3: Costing process diagram*
Review in conjunction with the stages in COS001.
* Extract from the costing process diagram which can be found at https://www.england.nhs.uk/approved-costing-guidance/
Contact us: costing@england.nhs.uk
NHS England and NHS Improvement
Skipton House
80 London Road
London
SE1 6LH
This publication can be made available in other formats on request.
© NHS England and NHS Improvement March 2022
Publication approval reference: PAR1304`;

  // Get breath and depth parameters
  const breadth =
    parseInt(
      await askQuestion(
        'Enter research breadth (recommended 2-10, default 4): ',
      ),
      10,
    ) || 4;
  const depth =
    parseInt(
      await askQuestion('Enter research depth (recommended 1-5, default 2): '),
      10,
    ) || 2;
  const isReport =
    (await askQuestion(
      'Do you want to generate a long report or a specific answer? (report/answer, default report): ',
    )) !== 'answer';

  let combinedQuery = initialQuery;
  if (isReport) {
    log(`Creating research plan...`);

    // Collect answers to follow-up questions
  }

  log('\nStarting research...\n');

  // const { insights: learnings, visitedUrls } = await deepResearch({
  //   query: combinedQuery,
  // breadth,
  //   depth,

  // });
  const visitedUrls: any[] = [];
  const report = await understandRequirementNew({
    fullRequirement: combinedQuery,
    askQuestion: askQuestion,
    messages: [],
  });

  // log(`\n\nLearnings:\n\n${learnings.join('\n')}`);
  // log(`\n\nVisited URLs (${visitedUrls.length}):\n\n${visitedUrls.join('\n')}`);
  // log('Writing final report...');

  if (isReport) {
    // const report = await writeFinalReport({
    //   messages: learnings,
    //   prompt: combinedQuery,
    //   learnings: JSON.stringify(learnings),
    //   visitedUrls,
    // });
    console.log(`\n\nFinal Report:\n\n${report}`);
    console.log('\nReport has been saved to report.md');
  } else {
    // const answer = await writeFinalAnswer({
    //   prompt: combinedQuery,
    //   learnings: JSON.stringify(learnings),
    // });
    console.log(`\n\nFinal Answer:\n\n${report}`);
    console.log('\nAnswer has been saved to answer.md');
  }

  rl.close();
}

run().catch(console.error);
