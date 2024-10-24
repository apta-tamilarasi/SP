let textarea = document.getElementsByTagName("textarea")
let recordDiv = document.getElementById("recorddiv")
let isJournal = false
let records = []
let journalId = ""
let newRecord = []
let nettPay = 0
let currencyInput = document.getElementById("currency")
let bankName = document.getElementById("bankname")
let mappingDatas = []
let mappingLabel = document.getElementsByClassName("mapping-label")

const journalCreate = async () => {
    await journalCustomGet("", 1)
    await journal()
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

const journal = async () => {
    document.getElementById("create-journal").innerHTML = 'Creating <span class="dots"><span class="dot"></span><span class="dot"></span><span class="dot"></span></span> ';
    document.getElementById("create-journal").disabled = true

    let salaryDeductionAccount = ''
    let nettPayAmount = 0
    const journalData = {
        "journal_date": `${journalDate}`,
        "reference_number": `Simple Pay - ${paymentRunId}`,
        "notes": `${textarea[0].value}`,
        "status": transactionType[2].checked === true ? "draft" : "published",
        "line_items": [
        ]
    }
    for (let i = 0; i < input.length; i++) {
        let value = JSON.parse(input[i].value)
        let obj = {
            "account_id": value.account,
            "debit_or_credit": value.type,
            "amount": Object.values(value.amount).reduce((acc, val) => acc + val, 0),
            "description": value.label
        }
        if (value.label === "Nett Pay") {
            salaryDeductionAccount = value.account
            nettPayAmount = obj.amount
        }
        journalData.line_items.push(obj)

    }
    console.log(journalData);
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
                await createEmployeeTransaction(payAccount[0].value, salaryDeductionAccount, transactionType[0].checked === true ? "individual" : "group", nettPayAmount)
                ShowNotification("success", "Journal created successfully")
                createJournalBtn.style.display = "none"
                createJournalBtn.disabled = false
                paymentRunDiv.style.visibility = "hidden"
                textareaDiv.style.visibility = "hidden"
                textarea[0].value = ""
                await journalCustomCreate(responseJSON)
                document.getElementById("create-journal").innerHTML = 'Create Journal';
                document.getElementById("create-journal").disabled = false
                pageNav(0)

            }
            else {
                createJournalBtn.style.display = "none"
                createJournalBtn.disabled = false
                paymentRunDiv.style.visibility = "hidden"
                textareaDiv.style.visibility = "hidden"
                textarea[0].value = ""
                simplepayClientGet()
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
            console.log(responseJSON);
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

let fieldmapCustomPost = async (mappingData) => {
    let custom = {
        url: `${orgDetails.dc}/cm__com_kz7zl3_simple_pay_field_mapping?organization_id=${orgDetails.orgId}`,
        method: "POST",
        body: {
            mode: "raw",
            raw: mappingData,
        },
        connection_link_name: "zohobook",
    };
    ZFAPPS.request(custom)
        .then(async function (value) {
            let responseJSON = JSON.parse(value.data.body);
            console.log(responseJSON);
        })
        .catch(function (err) {
            console.error("err", err);
        });
};

let fieldmapCustomPut = async (mappingData, record_id) => {
    let custom = {
        url: `${orgDetails.dc}/cm__com_kz7zl3_simple_pay_field_mapping/${record_id}?organization_id=${orgDetails.orgId}`,
        method: "PUT",
        body: {
            mode: "raw",
            raw: mappingData,
        },
        connection_link_name: "zohobook",
    };
    ZFAPPS.request(custom)
        .then(async function (value) {
            let responseJSON = JSON.parse(value.data.body);
            console.log(responseJSON);
        })
        .catch(function (err) {
            console.error("err", err);
        });
};


let fieldmapCustomGet = async (payrunDetails) => {
    mappingDatas = []

    let custom = {
        url: `${orgDetails.dc}/cm__com_kz7zl3_simple_pay_field_mapping?organization_id=${orgDetails.orgId}`,
        method: "GET",
        connection_link_name: "zohobook",
    };
    ZFAPPS.request(custom)
        .then(async function (value) {
            let fieldmapData = JSON.parse(value.data.body)
            console.log(fieldmapData);
            if (fieldmapData.module_records.length === 0) {
                mappingDatas = []

            }
            else {
                let fieldMappingData = fieldmapData.module_records;
                mappingDatas = fieldMappingData;
            }
            await createMapping(payrunDetails)

        })
        .catch(function (err) {
            console.error("custom get request failed", err);
        });

}

const storeFieldMapping = async () => {
    console.log(mappingDatas);

    if (mappingDatas.length > 0) {
        for (let i = 0; i < input.length; i++) {
            let value = JSON.parse(input[i].value);

            let matchedMapping = mappingDatas.find((d) => {
                return d.cf__com_kz7zl3_label_name === `${value.type}_${value.label}`;
            });

            console.log(matchedMapping);
            let data = {
                cf__com_kz7zl3_zb_account: value.account,
                cf__com_kz7zl3_label_name: `${value.type}_${value.label}`
            }
            if (!matchedMapping) {
                await fieldmapCustomPost(data)
            }
            else {
                if (matchedMapping.cf__com_kz7zl3_zb_account !== value.account) {
                    let data = {
                        cf__com_kz7zl3_zb_account: value.account,
                        cf__com_kz7zl3_label_name: `${value.type}_${value.label}`
                    }
                    await fieldmapCustomPut(data, matchedMapping.module_record_id)
                }

            }
        }
        let label = [{ name: "bank", value: payAccount[0].value },
        { name: "transaction_type", value: transactionType[0].checked === true ? "individual" : "group" },
        { name: "journal_type", value: transactionType[2].checked === true ? "draft" : "published" }]

        for (let i = 0; i < label.length; i++) {
            let dataEdit = {
                cf__com_kz7zl3_zb_account: label[i].value,
                cf__com_kz7zl3_label_name: label[i].name
            }
            mappingDatas.map(async(data) => {
                if ((data.cf__com_kz7zl3_label_name === label[i].name)&&(data.cf__com_kz7zl3_zb_account!==label[i].value)) {
                    await fieldmapCustomPut(dataEdit, data.module_record_id)
                }
            })
        }



    }
    else {
        let label = [{ name: "bank", value: payAccount[0].value },
        { name: "transaction_type", value: transactionType[0].checked === true ? "individual" : "group" },
        { name: "journal_type", value: transactionType[2].checked === true ? "draft" : "published" }]
        for (let i = 0; i < input.length; i++) {
            let value = JSON.parse(input[i].value);
            let data = {
                cf__com_kz7zl3_zb_account: value.account,
                cf__com_kz7zl3_label_name: `${value.type}_${value.label}`
            }
            await fieldmapCustomPost(data)
        }
        for (let i = 0; i < label.length; i++) {
            let data = {
                cf__com_kz7zl3_zb_account: label[i].value,
                cf__com_kz7zl3_label_name: label[i].name
            }
            await fieldmapCustomPost(data)
        }



    }
}