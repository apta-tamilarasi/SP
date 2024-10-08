let textarea = document.getElementsByTagName("textarea")
let recordDiv = document.getElementById("recorddiv")
let isJournal = false
let records = []
let journalId = ""
let newRecord = []
let nettPay = 0
let currencyInput = document.getElementById("currency")
let bankName = document.getElementById("bankname")

const journalCreate = async (details) => {
    await journalCustomGet("", 1)
    await journal(details)
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

const journal = async (details) => {
    const journalData = {
        "journal_date": `${journalDate}`,
        "reference_number": `Simple Pay - ${paymentRunId}`,
        "notes": `${textarea[0].value}`,
        "status": fieldmappingData[0].cf__com_kz7zl3_journal_entry,
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
            c.line_item === "nett_pay" ? nettPay = total : ""
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

    let journal = {
        url: `${orgDetails.dc}/journals?organization_id=${orgDetails.orgId}`,
        method: "POST",
        body: {
            mode: "raw",
            raw: journalData,
        },
        connection_link_name: "zohobook",
    };
    ZFAPPS.request(journal)
        .then(async function (value) {
            let responseJSON = JSON.parse(value.data.body);

            if (responseJSON.code == 0) {
                await createEmployeeTransaction(fieldmappingData[0].cf__com_kz7zl3_wage_account, fieldmappingData[0].cf__com_kz7zl3_salary_deducation, fieldmappingData[0].cf__com_kz7zl3_transaction_type, nettPay)
                ShowNotification("success", "Journal created successfully")
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

            records = [...responseJSON.module_records]
            page = page + 1;
            if (responseJSON.page_context.has_more_page === true) {
                journalCustomGet(type, page);
            } else {
                isJournal = false
                if (records.length !== 0) {
                    if (type === "") {
                        recordDiv.style.display = "none"
                        records.map(async (re) => {
                            if (`Simple Pay - ${paymentRunId}` === re.cf__com_kz7zl3_reference_id) {
                                await deleteJournal(`${re.module_record_id},${re.cf__com_kz7zl3_id}`, "other")
                            }
                        })
                    }
                    else if (type === "record") {
                        navView[1].style.display = "block"
                        await pagination(records)
                    }
                }
                else {
                    if (type === "record") {
                        navView[1].style.display = "none"
                        navView[0].style.display = "none"
                        recordDiv.style.display = "none"
                        document.getElementById("waitingMessage").style.display = "none";
                        document.getElementById("warning").style.display = "block"
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
    newRecord = []
    for (let re of records) {
        let journal = {
            url: `${orgDetails.dc}/journals/${re.cf__com_kz7zl3_id}?organization_id=${orgDetails.orgId}`,
            method: "GET",
            connection_link_name: "zohobook",
        };

        try {
            let value = await ZFAPPS.request(journal);
            let responseJSON = JSON.parse(value.data.body);

            if (responseJSON.code === 1002) {
                await deleteJournal(`${re.module_record_id},${re.cf__com_kz7zl3_id}`, "other");
            } else {
                newRecord.push(re);
            }
        } catch (err) {
            console.error("Error:", err);
        }
    }

    document.getElementById("waitingMessage").style.display = "none";
    document.getElementById("warning").style.display = "none";

    const objects = newRecord;
    let currentPage = 1;
    const itemsPerPage = 10;

    if (newRecord.length > 0) {
        document.getElementById("waitingMessage").style.display = "none";
        document.getElementById("warning").style.display = "none"
        function displayObjects(page) {
            const objectList = document.getElementById('records');
            objectList.innerHTML = '';
            const start = (page - 1) * itemsPerPage;
            const end = start + itemsPerPage;
            const paginatedObjects = objects.slice(start, end);

            paginatedObjects.forEach((obj, i) => {
                const row = document.createElement('tr');
                row.style.position = 'relative';

                const no = document.createElement('td');
                no.textContent = start + i + 1;
                const idCell = document.createElement('td');
                idCell.textContent = obj.cf__com_kz7zl3_date;

                const nameCell = document.createElement('td');
                nameCell.textContent = obj.cf__com_kz7zl3_reference_id;
                const note = document.createElement('td');
                note.textContent = obj.cf__com_kz7zl3_notes;

                const total = document.createElement('td');
                total.textContent = obj.cf__com_kz7zl3_total;

                const deleteIcon = document.createElement('td');
                deleteIcon.innerHTML = '<i class="fa fa-trash-o" aria-hidden="true"></i>';
                deleteIcon.classList.add('delete-icon');
                deleteIcon.setAttribute("onclick", `deleteJournal('${obj.module_record_id},${obj.cf__com_kz7zl3_id}')`)

                row.appendChild(no);
                row.appendChild(idCell);
                row.appendChild(nameCell);
                row.appendChild(note);
                row.appendChild(total);
                row.appendChild(deleteIcon);
                objectList.appendChild(row);
            });
            recordDiv.style.display = "block"
            navView[1].style.display = "block"
            renderPaginationButtons();
        }

        function renderPaginationButtons() {
            const totalPages = Math.ceil(objects.length / itemsPerPage);
            const paginationDiv = document.getElementById('pagination');
            paginationDiv.innerHTML = '';

            const prevButton = document.createElement('button');
            prevButton.textContent = '<';
            prevButton.classList.add('btn-primary', 'mr-2');
            prevButton.disabled = currentPage === 1;
            if (currentPage === 1) {
                prevButton.style.cursor = 'not-allowed';
            }
            prevButton.onclick = () => changePage(currentPage - 1);
            paginationDiv.appendChild(prevButton);

            const pageButton = document.createElement('button');
            pageButton.textContent = currentPage;
            pageButton.classList.add('btn-secondary', 'mr-2');
            pageButton.disabled = true;
            paginationDiv.appendChild(pageButton);

            const nextButton = document.createElement('button');
            nextButton.textContent = '>';
            nextButton.classList.add('btn-primary');
            nextButton.disabled = currentPage === totalPages;
            if (currentPage === totalPages) {
                nextButton.style.cursor = 'not-allowed';
            }
            nextButton.onclick = () => changePage(currentPage + 1);
            paginationDiv.appendChild(nextButton);

            if (totalPages === 1) {
                paginationDiv.style.display = 'none';
            } else {
                paginationDiv.style.display = 'block';
            }
        }

        function changePage(page) {
            currentPage = page;
            displayObjects(currentPage);
        }

        displayObjects(currentPage);
    }
    else {
        recordDiv.style.display = "none";
        document.getElementById("waitingMessage").style.display = "none";
        document.getElementById("warning").style.display = "block"
        ShowNotification("error", `Journal Record is not available, Create new journal`)
    }
};

const deleteJournal = async (id, type) => {
    if (type != "other") {
        recordDiv.style.display = "none"
        document.getElementById("waitingMessage").style.display = "block";
        document.getElementById("waitingMessage").innerHTML = "Deleting... Please wait"
    }
    let ids = id.split(",")
    let idModule = ids[0]
    let idJournal = ids[1]
    try {

        let journal = {
            url: `${orgDetails.dc}/journals/${idJournal}?organization_id=${orgDetails.orgId}`,
            method: "DELETE",
            connection_link_name: "zohobook",
        };
        await ZFAPPS.request(journal)
            .then(async function (value) {
                let responseJSON = JSON.parse(value.data.body);

            })
            .catch(function (err) {
                console.error("err", err);
            })

        let module = {
            url: `${orgDetails.dc}/cm__com_kz7zl3_journal_record/${idModule}?organization_id=${orgDetails.orgId}`,
            method: "DELETE",
            connection_link_name: "zohobook",
        };
        await ZFAPPS.request(module)
            .then(async function (value) {
                let responseJSON = JSON.parse(value.data.body);

            })
            .catch(function (err) {
                console.error("err", err);
            })
        if (type !== "other") {
            recordDiv.style.display = "none"
            ShowNotification("success", `Journal Deleted Successfully!`)
            await journalCustomGet("record", 1)
        }
    }
    catch (err) {
        console.error(err);
        recordDiv.style.display = "block"
        document.getElementById("waitingMessage").style.display = "none";
        ShowNotification("error", `Journal can't be Deleted`)
    }


}


// const journalGet = async (idJournal,ids) => {
//     try {

//         let journal = {
//             url: `${orgDetails.dc}/journals/${idJournal}?organization_id=${orgDetails.orgId}`,
//             method: "GET",
//             connection_link_name: "zohobook",
//         };
//         await ZFAPPS.request(journal)
//             .then(async function (value) {
//                 let responseJSON = JSON.parse(value.data.body);
//                 console.log(responseJSON)
//                 if(responseJSON.journal.length===0||responseJSON.code===1002){
//                     await deleteJournal(ids, "other")
//                 }
//                 else{
//                     isJournal = true
//                 }

//             })
//             .catch(function (err) {
//                 console.error("err", err);
//             })
//     }
//     catch (err) {
//         console.error(err);
//     }
// }

const createEmployeeTransaction = async (fromAcc, toAcc, transactionType, nettPay) => {

    if (transactionType === "group") {
        let data = {
            "transaction_type": "expense",
            "account_id": toAcc,
            "paid_through_account_id": fromAcc,
            "date": journalDate,
            "amount": nettPay,
            "description": `Simple pay - All employees payment - ${paymentRunId}`,
            "reference_number": `Simple Pay - ${paymentRunId}`,

        }
        await createExpense(data)
    }
    else {
        let employeePayslip = await getPayslipForSpecificPayrun()
        employeePayslip.map(async (ps) => {
            let data = {
                "account_id": toAcc,
                "paid_through_account_id": fromAcc,
                "date": journalDate,
                "amount": ps.payslip.nett_pay,
                "description": `Simple pay individual employee payment - ${paymentRunId}`,
                "reference_number": `Simple Pay - ${paymentRunId}`,

            }
            await createExpense(data)

        })

    }
}


const createExpense = async (data) => {
    let journal = {
        url: `${orgDetails.dc}/expenses?organization_id=${orgDetails.orgId}`,
        method: "POST",
        body: {
            mode: "raw",
            raw: data,
        },
        connection_link_name: "zohobook",
    };
    ZFAPPS.request(journal)
        .then(async function (value) {
            let responseJSON = JSON.parse(value.data.body);

        })
        .catch((err) => {
            console.log(err);

        })
}



const createCurrency = async () => {
    let journal = {
        url: `${orgDetails.dc}/settings/currencies?organization_id=${orgDetails.orgId}`,
        method: "GET",
        connection_link_name: "zohobook",
    };
    ZFAPPS.request(journal)
        .then(async function (value) {
            currencyInput.textContent = ""
            let selectedOption = document.createElement("option")
            selectedOption.textContent = "Choose a currency type"
            selectedOption.value = ''
            selectedOption.selected = true
            currencyInput.appendChild(selectedOption)
            let responseJSON = JSON.parse(value.data.body);
            responseJSON.currencies.map((c) => {
                let selectedOption = document.createElement("option")
                selectedOption.textContent = c.currency_code
                selectedOption.value = c.currency_id
                currencyInput.appendChild(selectedOption)
            })


        })
        .catch((err) => {
            console.log(err);

        })
}


const createBank = async () => {
    if (bankName.value != "" && currencyInput.value != "") {
        document.getElementById("bankcreate").disabled = true
        let data = {
            "account_name": bankName.value,
            "account_type": "bank",
            "currency_id": currencyInput.value
        }
        let journal = {
            url: `${orgDetails.dc}/bankaccounts?organization_id=${orgDetails.orgId}`,
            method: "POST",
            body: {
                mode: "raw",
                raw: data,
            },
            connection_link_name: "zohobook",
        };
        ZFAPPS.request(journal)
            .then(async function (value) {
                let responseJSON = JSON.parse(value.data.body);
                var myModal = bootstrap.Modal.getInstance(document.getElementById('staticBackdrop'))
                myModal.hide()
                document.getElementById("bankcreate").disabled = false
                if (responseJSON.code === 0) {
                    let option = document.createElement("option")
                    option.textContent = responseJSON.bankaccount.account_name
                    option.value = responseJSON.bankaccount.account_id
                    payAccount[0].appendChild(option)
                    bankName.value = ""
                    ShowNotification("success", `Bank Account created succesfully`)
                }

            })
            .catch((err) => {
                console.log(err);

            })
    }
    else {
        ShowNotification("error", `Field cannot be empty`)
    }
}
