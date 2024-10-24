

let clientInput = document.getElementsByClassName("payrun-input")
let paymentRun = document.getElementsByClassName("paymentrun-input")
let paymentRunDiv = document.getElementById("paymentrun-div")
let textareaDiv = document.getElementById("textarea-div")
let paymentRunId = ""
let journalDate = ''
let payrunDetails = []

const simplepayClientGet = async () => {
    let client = {
        url: `https://api.payroll.simplepay.cloud/v1/clients/`,
        method: "GET",
        connection_link_name: "paysimple",
    };
    ZFAPPS.request(client)
        .then(function (value) {
            try {
                let clients = JSON.parse(value.data.body)
                clientInput[0].textContent = ""
                let selectedOption = document.createElement("option")
                selectedOption.textContent = "Select the Company"
                selectedOption.value = ''
                selectedOption.selected = true
                clientInput[0].appendChild(selectedOption)
                clients.map((com) => {
                    let option = document.createElement("option")
                    option.textContent = com.client.name
                    option.value = com.client.id
                    clientInput[0].appendChild(option)
                })
            }
            catch (err) {
                console.error(err);

            }
        })
        .catch(function (err) {
            console.error("client request failed", err);
        });
}

const clientSelect = async (value) => {
    if (value != "") {
        await simplepayPaymentRunGet(value)
    }
    else {
        paymentRunDiv.style.visibility = "hidden"
        textareaDiv.style.visibility = "hidden"
        ShowNotification("error", "Please select the Valid company")
    }
}
const payrunSelect = (value) => {
    let splitValue = value.split(",")
    paymentRunId = splitValue[0]
    journalDate = splitValue[1]
    createJournalBtn.innerHTML = "Next"
    createJournalBtn.style.display = "block"

}

const simplepayPaymentRunGet = async (id) => {
    let client = {
        url: `https://api.payroll.simplepay.cloud/v1/clients/${id}/payment_runs`,
        method: "GET",
        connection_link_name: "paysimple",
    };
    ZFAPPS.request(client)
        .then(function (value) {
            console.log(JSON.parse(value.data.body));

            try {
                let paymentruns = JSON.parse(value.data.body)
                if (paymentruns.length > 0) {
                    paymentRunDiv.style.visibility = "visible"
                    textareaDiv.style.visibility = "visible"
                    paymentRun[0].textContent = ""
                    let selectedOption = document.createElement("option")
                    selectedOption.textContent = "Select the Payrun"
                    selectedOption.value = ''
                    selectedOption.selected = true
                    paymentRun[0].appendChild(selectedOption)
                    paymentruns.map((pay) => {
                        let option = document.createElement("option")
                        option.textContent = pay.payment_run.period_end_date
                        option.value = `${pay.payment_run.id},${pay.payment_run.period_end_date}`
                        paymentRun[0].appendChild(option)
                    })
                }
                else {
                    paymentRunDiv.style.visibility = "hidden"
                    textareaDiv.style.visibility = "hidden"
                    createJournalBtn.style.display = "none"
                    createJournalBtn.disabled = false
                    ShowNotification("error", "There is no payrun data avilable for the selected company")
                }


            }
            catch (err) {
                console.error(err);

            }
        })
        .catch(function (err) {
            console.error("client request failed", err);
        });
}


const getPayment = async () => {

    let textarea = document.getElementsByTagName("textarea")
    if (textarea[0].value != "") {
        createJournalBtn.innerHTML = 'Wait <span class="dots"><span class="dot"></span><span class="dot"></span><span class="dot"></span></span> ';
        createJournalBtn.disabled = true
        let pay = {
            url: `https://api.payroll.simplepay.cloud/v1/payment_runs/${paymentRunId}/accounting`,
            method: "GET",
            connection_link_name: "paysimple",
        };
        ZFAPPS.request(pay)
            .then(async function (value) {
                console.log(JSON.parse(value.data.body));

                try {
                    payrunDetails = JSON.parse(value.data.body)
                    await fieldmapCustomGet(payrunDetails)
                    // await journalCreate(payrunDetails)
                }
                catch (err) {
                    createJournalBtn.disabled = false
                    console.error(err);
                }
            })
    }
    else {
        createJournalBtn.disabled = false
        ShowNotification("error", "Note Field cannot be empty")

    }
}
// 5361284


const getPayslipForSpecificPayrun = async () => {
    let client = {
        url: `https://api.payroll.simplepay.cloud/v1/payment_runs/${paymentRunId}/payslips`,
        method: "GET",
        connection_link_name: "paysimple",
    }

    return ZFAPPS.request(client)
        .then(function (value) {
            console.log(value);

            console.log(JSON.parse(value.data.body));

            try {

                return JSON.parse(value.data.body);

            }
            catch (err) {
                console.error(err);

            }
        })
        .catch(function (err) {
            console.error("client request failed", err);
        });
}