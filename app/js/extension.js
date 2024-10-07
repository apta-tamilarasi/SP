
let orgDetails = {};
let input = document.getElementsByClassName("fieldmap-input")
let fieldMap = document.getElementById("fieldmap")
let payrun = document.getElementById("payrun")
let fieldmappingData = []
let createJournalBtn = document.getElementById("create-journal-btn")
let nav = document.getElementsByTagName("a")
let navView = document.getElementsByClassName("navTab")
let recordId = ''
let isEdit = false
let payAccount = document.getElementsByClassName("payment-account")
let transactionType = document.getElementsByClassName("form-check-input")
let salaryDeductionAccount = document.getElementById("salary-deduction")


window.onload = function () {
    ZFAPPS.extension.init().then(function (App) {
        ZFAPPS.get("organization")
            .then(async function (data) {
                orgDetails.dc = data.organization.api_root_endpoint;
                orgDetails.orgId = data.organization.organization_id;
                await chartOfAccountGet()
                await customGet()
            })
            .catch(function (err) {
                console.error(err);
            });
    });
};


let chartOfAccountGet = async () => {
    let account = {
        url: `${orgDetails.dc}/chartofaccounts?organization_id=${orgDetails.orgId}`,
        method: "GET",
        connection_link_name: "zohobook",
    };
    ZFAPPS.request(account)
        .then(function (value) {

            // input.map((input) => {
            for (let i = 0; i < input.length; i++) {
                input[i].textContent = ""
                let selectedOption = document.createElement("option")
                selectedOption.textContent = "Choose a ZB account"
                selectedOption.value = ''
                selectedOption.selected = true
                input[i].appendChild(selectedOption)
                let accounts = JSON.parse(value.data.body)
                if (i === 0) {
                    payAccount[0].textContent = ""
                    salaryDeductionAccount.textContent = ''
                    let selectedOption = document.createElement("option")
                    selectedOption.textContent = "Choose a ZB Bank account"
                    selectedOption.value = ''
                    selectedOption.selected = true
                    payAccount[0].appendChild(selectedOption)

                    let selectedOptionSalary = document.createElement("option")
                    selectedOptionSalary.textContent = "Choose a ZB account"
                    selectedOptionSalary.value = ''
                    selectedOptionSalary.selected = true
                    salaryDeductionAccount.appendChild(selectedOptionSalary)

                }

                accounts.chartofaccounts.map((acc) => {
                    let option = document.createElement("option")
                    option.textContent = acc.account_name
                    option.value = acc.account_id

                    if (i === 0) {
                        if (acc.account_type === "expense") {
                            let optionSalary = document.createElement("option")
                            optionSalary.textContent = acc.account_name
                            optionSalary.value = acc.account_id
                            salaryDeductionAccount.appendChild(optionSalary)

                        }
                        if (acc.account_type === "bank") {
                            payAccount[0].appendChild(option)
                        }
                    }
                    if (i >= 0 && i <= 5) {
                        if (acc.account_type === "expense") {
                            input[i].appendChild(option)
                        }
                    }
                    else {
                        if (acc.account_type === "income") {
                            input[i].appendChild(option)
                        }
                    }
                })
            }
            // })


        })
        .catch(function (err) {
            console.error("chartof account request failed", err);
        });
};

const cancel = () => {
    for (let i = 0; i < input.length; i++) {
        input[i].textContent = ""
    }
    chartOfAccountGet()
}
const save = async () => {
    if (isEdit === true) {
        await fieldMapDelete()
    }
    let isEmpty = false
    for (let i = 0; i < input.length; i++) {
        if (input[i].value === "") {
            isEmpty = true
            break;
        }
    }
    if (payAccount[0].value === "" && salaryDeductionAccount.value != "") {
        isEmpty = true
    }
    if (isEmpty) {
        ShowNotification("error", "Please map all field")
    }
    else {
        ShowNotification("success", "Field mapping successfully")
        let mappingData = {
            cf__com_kz7zl3_field_mapping: input[0].value,
            cf__com_kz7zl3_debit_uif_employer: input[1].value,
            cf__com_kz7zl3_debit_basic_salary: input[2].value,
            cf__com_kz7zl3_debit_medical: input[3].value,
            cf__com_kz7zl3_debit_pension: input[4].value,
            cf__com_kz7zl3_debit_other: input[5].value,
            cf__com_kz7zl3_credit_sdl_employer: input[6].value,
            cf__com_kz7zl3_credit_uif_total: input[7].value,
            cf__com_kz7zl3_credit_nett_pay: input[8].value,
            cf__com_kz7zl3_credit_tax: input[9].value,
            cf__com_kz7zl3_credit_medical: input[10].value,
            cf__com_kz7zl3_credit_pension: input[11].value,
            cf__com_kz7zl3_credit_other: input[12].value,
            cf__com_kz7zl3_wage_account: payAccount[0].value,
            cf__com_kz7zl3_salary_deducation: salaryDeductionAccount.value,
            cf__com_kz7zl3_transaction_type: transactionType[0].checked === true ? "individual" : "group",
            cf__com_kz7zl3_journal_entry: transactionType[2].checked === true ? "draft" : "published"

        }
        fieldmappingData = [mappingData]
        fieldMap.style.display = "none"
        payrun.style.display = "block"
        await pageNav(0)
        await customPost(mappingData)
    }

}

let customGet = async () => {
    if (isEdit) {
        await fieldMapDelete()
    }
    let custom = {
        url: `${orgDetails.dc}/cm__com_kz7zl3_field_mapping?organization_id=${orgDetails.orgId}`,
        method: "GET",
        connection_link_name: "zohobook",
    };
    ZFAPPS.request(custom)
        .then(async function (value) {
            let fieldmapData = JSON.parse(value.data.body)
            if (fieldmapData.module_records.length === 0) {
                fieldMap.style.display = "block"
                payrun.style.display = "none"
            }
            else {
                fieldmappingData = fieldmapData.module_records
                recordId = fieldmapData.module_records[0].module_record_id
                fieldMap.style.display = "none"
                payrun.style.display = "block"
                await simplepayClientGet()
            }

        })
        .catch(function (err) {
            ShowNotification("error", "Simple Pay API Key is Invalid")
            console.error("custom get request failed", err);
        });

}
let customPost = async (mappingData) => {
    let custom = {
        url: `${orgDetails.dc}/cm__com_kz7zl3_field_mapping?organization_id=${orgDetails.orgId}`,
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
            recordId = responseJSON.module_record.module_record_id
            await simplepayClientGet()
        })
        .catch(function (err) {
            console.error("err", err);
        });
};

const ShowNotification = (type, message) => {
    ZFAPPS.invoke("SHOW_NOTIFICATION", {
        type,
        message,
    }).catch((er) => {
        console.error(er);
    });
};

const editMapping = async () => {
    fieldMap.style.display = "block"
    payrun.style.display = "none"
    isEdit = true

    input[0].value = fieldmappingData[0].cf__com_kz7zl3_field_mapping;
    input[1].value = fieldmappingData[0].cf__com_kz7zl3_debit_uif_employer;
    input[2].value = fieldmappingData[0].cf__com_kz7zl3_debit_basic_salary;
    input[3].value = fieldmappingData[0].cf__com_kz7zl3_debit_medical;
    input[4].value = fieldmappingData[0].cf__com_kz7zl3_debit_pension;
    input[5].value = fieldmappingData[0].cf__com_kz7zl3_debit_other;
    input[6].value = fieldmappingData[0].cf__com_kz7zl3_credit_sdl_employer;
    input[7].value = fieldmappingData[0].cf__com_kz7zl3_credit_uif_total;
    input[8].value = fieldmappingData[0].cf__com_kz7zl3_credit_nett_pay;
    input[9].value = fieldmappingData[0].cf__com_kz7zl3_credit_tax;
    input[10].value = fieldmappingData[0].cf__com_kz7zl3_credit_medical;
    input[11].value = fieldmappingData[0].cf__com_kz7zl3_credit_pension;
    input[12].value = fieldmappingData[0].cf__com_kz7zl3_credit_other;
    payAccount[0].value = fieldmappingData[0].cf__com_kz7zl3_wage_account
    salaryDeductionAccount.value = fieldmappingData[0].cf__com_kz7zl3_salary_deducation

    if (fieldmappingData[0].cf__com_kz7zl3_transaction_type === "individual") {
        transactionType[0].checked = true
        transactionType[1].checked = false
    }
    else {
        transactionType[1].checked = true
        transactionType[0].checked = false
    }
    if (fieldmappingData[0].cf__com_kz7zl3_journal_entry === "draft") {
        transactionType[2].checked = true
        transactionType[3].checked = false
    }
    else {
        transactionType[3].checked = true
        transactionType[2].checked = false
    }
}

const pageNav = async (index) => {
    index === 0 ? simplepayClientGet() : journalCustomGet("record", 1)
    if (index === 1) {
        recordDiv.style.display = "none";
        document.getElementById("waitingMessage").style.display = "block";
        document.getElementById("waitingMessage").innerHTML = "Fetching... Please wait"
    }
    for (let i = 0; i < nav.length; i++) {
        navView[i].style.display = "none"
        index === 0 ? createJournalBtn.style.display = "none" : ''
        paymentRunDiv.style.visibility = "hidden"
        textareaDiv.style.visibility = "hidden"
        document.getElementById("warning").style.display = "none"
        textarea[0].value = ""
        if (index === i) {
            nav[i].removeAttribute("class")
            nav[i].setAttribute("class", "nav-link active")
            index !== 1 ? navView[i].style.display = "block" : ""

        }
        else {
            nav[i].removeAttribute("class")
            nav[i].setAttribute("class", "nav-link")
        }

    }

}

let back = async () => {
    isEdit = false
    await customGet()
}

const fieldMapDelete = async () => {
    isEdit = false
    let customDel = {
        url: `${orgDetails.dc}/cm__com_kz7zl3_field_mapping/${recordId}?organization_id=${orgDetails.orgId}`,
        method: "DELETE",
        connection_link_name: "zohobook",
    };
    await ZFAPPS.request(customDel)
        .then(function (value) {
            console.log(value);
        })
        .catch((er) => {
            console.error(er);
        });
    isEdit = false

}