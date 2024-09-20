let textarea = document.getElementsByTagName("textarea")
let isJournal = false
let records = []

const journalCreate = async (details) => {

    console.log(textarea[0].value);

    console.log(journalDate);

    console.log(details);
    console.log(fieldmappingData);
    await journalCustomGet("", 1)
    console.log(isJournal);

    if (!isJournal) {
        await journal(details, "POST", "")
    }
    else {
        createJournalBtn.disabled = false
        ShowNotification("error", `This journal is already exits`)
    }


}

const journalCustomCreate = async (journalData) => {
    let data = {
        "cf__com_kz7zl3_reference_id": journalData.journal.reference_number,
        "cf__com_kz7zl3_id": journalData.journal.journal_id,
        "cf__com_kz7zl3_date": journalData.journal.journal_date,
        "cf__com_kz7zl3_notes": journalData.journal.notes,
        "cf__com_kz7zl3_total": journalData.journal.total,
    }
    let custom = {
        url: `${orgDetails.dc}/cm__com_kz7zl3_journal_record?organization_id=${orgDetails.orgId}`,
        method: "POST",
        body: {
            mode: "raw",
            raw: data,
        },
        connection_link_name: "zohobook",
    };
    ZFAPPS.request(custom)
        .then(function (value) {
            let responseJSON = JSON.parse(value.data.body);
            console.log(responseJSON);

        })
        .catch(function (err) {
            console.error("err", err);
        });
};

const journal = async (details, type, id) => {
    const journalData = {
        "journal_date": `${journalDate}`,
        // "entry_number":`sample pay -${journalNumber}`,
        "reference_number": `Simple Pay - ${paymentRunId}`,
        "notes": `Simple Pay ${journalDate} - ${textarea[0].value}`,
        "line_items": [
            {
                "account_id": fieldmappingData[0].cf__com_kz7zl3_debit_other,
                "debit_or_credit": "debit",
                "amount": 0,
                "description": "Other Expense"
            },
            {
                "account_id": fieldmappingData[0].cf__com_kz7zl3_credit_other,
                "debit_or_credit": "credit",
                "amount": 0,
                "description": "Other Liability"
            }
        ]
    }

    details.credit.map((c) => {
        let account = ""
        let otherExpense = false
        if (c.line_item === "medical_aid_liability") {
            account = fieldmappingData[0].cf__com_kz7zl3_credit_medical
        }
        else if (c.line_item === "nett_pay") {
            account = fieldmappingData[0].cf__com_kz7zl3_credit_nett_pay
        }
        else if (c.line_item === "sdl_employer") {
            account = fieldmappingData[0].cf__com_kz7zl3_credit_sdl_employer
        }
        else if (c.line_item === "uif_total") {
            account = fieldmappingData[0].cf__com_kz7zl3_credit_uif_total
        }
        else if (c.line_item === "pension_fund_total") {
            account = fieldmappingData[0].cf__com_kz7zl3_credit_pension
        }
        else if (c.line_item === "tax") {
            account = fieldmappingData[0].cf__com_kz7zl3_credit_tax
        }
        else {
            account = fieldmappingData[0].cf__com_kz7zl3_credit_other
            otherExpense = true
        }
        let total = Object.values(c.amount).reduce((acc, val) => acc + val, 0);
        if (otherExpense) {
            journalData.line_items[1].amount = journalData.line_items[0].amount + total
        }
        else {
            let obj = {
                "account_id": account,
                "debit_or_credit": "credit",
                "amount": total,
                "description": c.label + " Liability"
            }
            journalData.line_items.push(obj)
        }

    })
    details.debit.map((d) => {
        let account = ""
        let otherExpense = false
        if (d.line_item === "basic_salary") {
            account = fieldmappingData[0].cf__com_kz7zl3_debit_basic_salary
        }
        else if (d.line_item === "medical_aid_employer") {
            account = fieldmappingData[0].cf__com_kz7zl3_debit_medical
        }
        else if (d.line_item === "sdl_employer") {
            account = fieldmappingData[0].cf__com_kz7zl3_field_mapping
        }
        else if (d.line_item === "uif_employer") {
            account = fieldmappingData[0].cf__com_kz7zl3_debit_uif_employer
        }
        else if (d.line_item === "pension_fund_employer") {
            account = fieldmappingData[0].cf__com_kz7zl3_debit_pension
        }
        else {
            account = fieldmappingData[0].cf__com_kz7zl3_debit_other
            otherExpense = true
        }
        let total = Object.values(d.amount).reduce((acc, val) => acc + val, 0);
        console.log(total, otherExpense);

        if (otherExpense) {
            journalData.line_items[0].amount = journalData.line_items[0].amount + total
        }
        else {
            let obj = {
                "account_id": account,
                "debit_or_credit": "debit",
                "amount": total,
                "description": d.label + " Expense"
            }
            journalData.line_items.push(obj)
        }

    })


    journalData.line_items = journalData.line_items.filter((line) => {
        return line.amount !== 0
    })
    console.log(journalData);
    
    let path
    if (id != "") {
        path = `${orgDetails.dc}/journals?organization_id=${orgDetails.orgId}`
    }
    else {
        path = `${orgDetails.dc}/journals/${id}?organization_id=${orgDetails.orgId}`
    }
    let journal = {
        url: path,
        method: type,
        body: {
            mode: "raw",
            raw: journalData,
        },
        connection_link_name: "zohobook",
    };
    ZFAPPS.request(journal)
        .then(async function (value) {
            let responseJSON = JSON.parse(value.data.body);
            console.log(responseJSON);

            if (responseJSON.code == 0) {
                type === "POST" ? ShowNotification("success", "Journal created successfully into zohobook") : ShowNotification("success", "Journal edited successfully into zohobook")
                createJournalBtn.style.display = "none"
                createJournalBtn.disabled = false
                paymentRunDiv.style.visibility = "hidden"
                textareaDiv.style.visibility = "hidden"
                textarea[0].value = ""
                await journalCustomCreate(responseJSON)
                simplepayClientGet()
            }
            else {
                createJournalBtn.disabled = false
                ShowNotification("error", `${responseJSON.message}`)
            }

        })
        .catch(function (err) {
            console.error("err", err);
        });
}

const journalCustomGet = async (type, page) => {
    if (page === 1) {
        records = []
    }

    let custom = {
        url: `${orgDetails.dc}/cm__com_kz7zl3_journal_record?organization_id=${orgDetails.orgId}`,
        method: "GET",
        connection_link_name: "zohobook",
    };
    await ZFAPPS.request(custom)
        .then(async function (value) {
            let responseJSON = JSON.parse(value.data.body)
            console.log(responseJSON);
            records = [...responseJSON.module_records]
            page = page + 1;
            if (responseJSON.page_context.has_more_page === true) {
                journalCustomGet(type, page);
            } else {
                isJournal=false
                if (records.length !== 0) {
                    if (type === "") {
                        records.find((re) => {
                            if(`Simple Pay - ${paymentRunId}` === re.cf__com_kz7zl3_reference_id){
                                isJournal=true
                            } 
                        })
                    }
                    else if (type === "record") {
                        navView[1].style.display = "block"
                        await pagination(records)
                    }
                }
                else {
                    if(type==="record"){
                          navView[0].style.display = "none"
                        ShowNotification("error", `Journal Record is not available, Create new journal`)
                   
                    }
                }
            }
        })
        .catch(function (err) {
            console.error("err", err);
        })

}
const pagination = async (records) => {
    console.log(records)
    const objects = records

    let currentPage = 1;
    const itemsPerPage = 25;

        function displayObjects(page) {
            const objectList = document.getElementById('records');
            objectList.innerHTML = '';
            const start = (page - 1) * itemsPerPage;
            const end = start + itemsPerPage;
            const paginatedObjects = objects.slice(start, end);
    
            paginatedObjects.forEach((obj,i) => {
                const row = document.createElement('tr');
                const no = document.createElement('td');
                no.textContent = start+i+1;
                const idCell = document.createElement('td');
                idCell.textContent = obj.cf__com_kz7zl3_date;
    
                const nameCell = document.createElement('td');
                nameCell.textContent = obj.cf__com_kz7zl3_reference_id;
                const note= document.createElement('td');
                note.textContent = obj.cf__com_kz7zl3_notes;
                
                const total= document.createElement('td');
               total.textContent = obj.cf__com_kz7zl3_total;
               row.appendChild(no);
                row.appendChild(idCell);
                row.appendChild(nameCell);
                row.appendChild(note);
                row.appendChild(total);
                objectList.appendChild(row);
            });
    
            renderPaginationButtons();
        }
    
        function renderPaginationButtons() {
            const totalPages = Math.ceil(objects.length / itemsPerPage);
            const paginationDiv = document.getElementById('pagination');
            paginationDiv.innerHTML = '';
    
            const prevButton = document.createElement('button');
            prevButton.textContent = 'Previous';
            prevButton.classList.add('btn', 'btn-primary', 'mr-2');
            prevButton.disabled = currentPage === 1;
            prevButton.onclick = () => changePage(currentPage - 1);
            paginationDiv.appendChild(prevButton);
    
    
            let startPage = Math.max(1, currentPage - 1);
            let endPage = Math.min(totalPages, currentPage + 1);
            console.log(startPage,endPage);
            if(startPage===endPage){
                paginationDiv.style.display="none"
            }
            else{
                paginationDiv.style.display="block" 
            }
    
            for (let i = startPage; i <= endPage; i++) {
                const pageButton = document.createElement('button');
                pageButton.textContent = i;
                pageButton.classList.add('btn', 'btn-secondary', 'mr-2');
                if (i === currentPage) {
                    pageButton.disabled = true;
                }
                pageButton.onclick = () => changePage(i);
                paginationDiv.appendChild(pageButton);
            }
    
    
            const nextButton = document.createElement('button');
            nextButton.textContent = 'Next';
            nextButton.classList.add('btn', 'btn-primary');
            nextButton.disabled = currentPage === totalPages;
            nextButton.onclick = () => changePage(currentPage + 1);
            paginationDiv.appendChild(nextButton);
        }
    
        function changePage(page) {
            currentPage = page;
            displayObjects(currentPage);
        }
        displayObjects(currentPage);
    
};
