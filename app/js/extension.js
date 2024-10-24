
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
let income = []
let debit = []
let bank = []


window.onload = function () {
    ZFAPPS.extension.init().then(function (App) {
        ZFAPPS.get("organization")
            .then(async function (data) {
                orgDetails.dc = data.organization.api_root_endpoint;
                orgDetails.orgId = data.organization.organization_id;
                await chartOfAccountGet()
                await pageNav(0)
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
            console.log(JSON.parse(value.data.body));

            income = []
            expense = []
            bank = []
            let accounts = JSON.parse(value.data.body)
            accounts.chartofaccounts.map((acc) => {
                if (acc.account_type === "expense") {
                    expense.push(acc)
                }

                else if (acc.account_type === "other_current_liability") {
                    income.push(acc)
                }
                else if (acc.account_type === "bank") {
                    bank.push(acc)
                }
            })

        })
        .catch(function (err) {
            console.error("chartof account request failed", err);
        });
};

const save = async () => {
    let isEmpty = false
    for (let i = 0; i < input.length; i++) {
        if (input[i].value === "") {
            isEmpty = true
            break;
        }
    }
    payAccount[0].value !== "" ? "" : isEmpty = true
    if (isEmpty) {
        ShowNotification("error", "Please map all field")
    }
    else {
        await journal()
        await storeFieldMapping()
    }

}

const ShowNotification = (type, message) => {
    ZFAPPS.invoke("SHOW_NOTIFICATION", {
        type,
        message,
    }).catch((er) => {
        console.error(er);
    });
};


const pageNav = async (index) => {
    document.getElementById("mappingdiv").style.display = "none"
    document.getElementById("simplepay-payrun-select-div").style.display = "block"
    index === 0 ? simplepayClientGet() : journalCustomGet("record", 1)

    if (index === 1) {
        recordDiv.style.display = "none";
        document.getElementById("waitingMessage").style.display = "block";
        document.getElementById("waitingMessage").innerHTML = "Fetching... Please wait"
    }
    else if (index === 0) {
        createJournalBtn.style.display = "none"
        createJournalBtn.disabled = false
    }
    for (let i = 0; i < nav.length; i++) {
        navView[i].style.display = "none"

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
let createMapping = async (payrunDetails) => {
    document.getElementById("simplepay-payrun-select-div").style.display = "none";
    let head = document.getElementsByClassName("simplepayHead");
    document.getElementById("mappingdiv").style.display = "block";

    let simplepayMappedCategory = document.getElementsByClassName("simplepaymappedcategory");
    let simplepayUnmappedCategory = document.getElementsByClassName("simplepayunmappedcategory");
    payAccount[0].textContent = "";

    for (let i = 0; i < simplepayMappedCategory.length; i++) {
        simplepayMappedCategory[i].innerHTML = '';
        simplepayUnmappedCategory[i].innerHTML = '';
    }

    let selectedOption = document.createElement("option");
    selectedOption.textContent = "Choose a ZB Bank account";
    selectedOption.value = '';
    selectedOption.selected = true;
    payAccount[0].appendChild(selectedOption);

    bank.map((b) => {
        let option = document.createElement("option");
        option.textContent = b.account_name;
        option.value = b.account_id;
       
        if (mappingDatas.length > 0) {

            mappingDatas.map((data) => {
                (data.cf__com_kz7zl3_label_name === "bank") && (data.cf__com_kz7zl3_zb_account === b.account_id) ? option.selected = true :
                    data.cf__com_kz7zl3_label_name === "journal_type" ? data.cf__com_kz7zl3_zb_account === "published" ? transactionType[3].checked = true : transactionType[2].checked = true :
                        data.cf__com_kz7zl3_label_name === "transaction_type" ? data.cf__com_kz7zl3_zb_account === "group" ? transactionType[1].checked = true : transactionType[0].checked = true : selectedOption.selected = false
            })
        }
        payAccount[0].appendChild(option);
    });

    payrunDetails.debit.map((d) => {
        var div = document.createElement('div');
        div.className = 'input-group mb-3';
        var label = document.createElement('label');
        label.className = 'input-group-text mapping-label';
        label.setAttribute('for', 'inputGroupSelect01');
        label.textContent = d.label;

        var select = document.createElement('select');
        select.className = 'form-select fieldmap-input';
        select.id = 'inputGroupSelect01';
        var selectedOption = document.createElement('option');
        selectedOption.selected = true;
        selectedOption.textContent = 'Choose ZB Account';
        selectedOption.value = "";
        select.appendChild(selectedOption);
        div.appendChild(label);
        div.appendChild(select);

        let isMapped = false;  

        expense.map((e) => {
            var option = document.createElement('option');
            d.account = e.account_id;
            d.type = "debit";
            option.textContent = e.account_name;

            if (mappingDatas.length > 0) {
                mappingDatas.find((data) => {
                    if (data.cf__com_kz7zl3_label_name === `${d.type}_${d.label}` && data.cf__com_kz7zl3_zb_account === e.account_id) {
                        option.selected = true;
                        isMapped = true;  
                    }
                });
            }
            option.value = JSON.stringify(d);
            select.appendChild(option);
        });

        if (d.category === "salary_expense") {
            isMapped ? simplepayMappedCategory[0].appendChild(div) : simplepayUnmappedCategory[0].appendChild(div);
        } else if (d.category === "expense") {
            if (d.line_item === "pension_fund_employer" || d.line_item === "medical_aid_employer") {
                isMapped ? simplepayMappedCategory[1].appendChild(div) : simplepayUnmappedCategory[1].appendChild(div);
            } else {
                isMapped ? simplepayMappedCategory[2].appendChild(div) : simplepayUnmappedCategory[2].appendChild(div);
            }
        }
    });

    payrunDetails.credit.map((c) => {
        var div = document.createElement('div');
        div.className = 'input-group mb-3';
        var label = document.createElement('label');
        label.className = 'input-group-text mapping-label';
        label.setAttribute('for', 'inputGroupSelect01');
        label.textContent = c.label;

        var select = document.createElement('select');
        select.className = 'form-select fieldmap-input';
        select.id = 'inputGroupSelect01';
        var selectedOption = document.createElement('option');
        selectedOption.selected = true;
        selectedOption.textContent = 'Choose ZB Account';
        selectedOption.value = "";
        select.appendChild(selectedOption);
        div.appendChild(label);
        div.appendChild(select);

        let isMapped = false;  

        income.map((e) => {
            var option = document.createElement('option');
            c.account = e.account_id;
            c.type = "credit";
            option.textContent = e.account_name;

            if (mappingDatas.length > 0) {
                mappingDatas.find((data) => {
                    if (data.cf__com_kz7zl3_label_name === `${c.type}_${c.label}` && data.cf__com_kz7zl3_zb_account === e.account_id) {
                        option.selected = true;
                        isMapped = true;  
                    }
                });
            }
            option.value = JSON.stringify(c);
            select.appendChild(option);
        });

        if (c.line_item === "medical_aid_liability" || c.line_item === "pension_fund_total") {
            isMapped ? simplepayMappedCategory[3].appendChild(div) : simplepayUnmappedCategory[3].appendChild(div);
        } else {
            isMapped ? simplepayMappedCategory[4].appendChild(div) : simplepayUnmappedCategory[4].appendChild(div);
        }
    });

    for (let i = 0; i < simplepayMappedCategory.length; i++) {
        if (simplepayMappedCategory[i].innerHTML === '' && simplepayUnmappedCategory[i].innerHTML === '') {
            head[i].style.visibility = "hidden";
        }
    }
};

