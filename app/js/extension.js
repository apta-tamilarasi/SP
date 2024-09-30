
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


window.onload = function () {
    ZFAPPS.extension.init().then(function (App) {
        ZFAPPS.get("organization")
            .then(async function (data) {
                console.log(data, input);
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
            // console.log(value);
            // input.map((input) => {
            for (let i = 0; i < input.length; i++) {
                input[i].textContent = ""
                let selectedOption = document.createElement("option")
                selectedOption.textContent = "Choose a Zohobook account"
                selectedOption.value = ''
                selectedOption.selected = true
                input[i].appendChild(selectedOption)
                let accounts = JSON.parse(value.data.body)
                console.log(accounts);

                accounts.chartofaccounts.map((acc) => {
                    let option = document.createElement("option")
                    option.textContent = acc.account_name
                    option.value = acc.account_id

                    // if(i>=0&&i<=5){
                    //     if(acc.account_type==="expense"||acc.account_type==="other_expense"||acc.account_type==="other_current_asset"||acc.account_type==="accounts_payable"){
                    //         input[i].appendChild(option)
                    //     }
                    // }
                    // else{
                    //     if(acc.account_type==="income"||acc.account_type==="other_income"||acc.account_type==="other_current_liability"||acc.account_type==="accounts_receivable"){
                    //         input[i].appendChild(option)
                    //     } 
                    // }

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
    let isEmpty = false
    for (let i = 0; i < input.length; i++) {
        if (input[i].value === "") {
            isEmpty = true
            break;
        }
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
            cf__com_kz7zl3_credit_other: input[12].value
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
    let custom = {
        url: `${orgDetails.dc}/cm__com_kz7zl3_field_mapping?organization_id=${orgDetails.orgId}`,
        method: "GET",
        connection_link_name: "zohobook",
    };
    ZFAPPS.request(custom)
        .then(async function (value) {
            let fieldmapData = JSON.parse(value.data.body)
            console.log(fieldmapData);

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
            console.log(responseJSON);
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

const editMapping = () => {
    fieldMap.style.display = "block"
    payrun.style.display = "none"
    isEdit=true

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
}

const pageNav = async (index) => {
    index === 0 ? simplepayClientGet() : journalCustomGet("record", 1)
    if (index === 1) {
        recordDiv.style.display = "none";
        document.getElementById("waitingMessage").style.display = "block";
        document.getElementById("waitingMessage").innerHTML = "Record Fetching... Please wait"
    }
    for (let i = 0; i < nav.length; i++) {
        navView[i].style.display = "none"
       index===0? createJournalBtn.style.display = "none":''
        paymentRunDiv.style.visibility = "hidden"
        textareaDiv.style.visibility = "hidden"
        document.getElementById("warning").style.display="none"
        textarea[0].value = ""
        console.log(index);
        
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

let back=async()=>{
    isEdit=false
   await customGet()
}
