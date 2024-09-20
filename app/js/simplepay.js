let clientInput = document.getElementsByClassName("payrun-input")
let paymentRun = document.getElementsByClassName("paymentrun-input")
let paymentRunDiv = document.getElementById("paymentrun-div")
let textareaDiv = document.getElementById("textarea-div")
let paymentRunId = ""
let journalDate=''
let payrunDetails=[]

const simplepayClientGet = async () => {
    let client = {
        url: `https://api.payroll.simplepay.cloud/v1/clients/`,
        method: "GET",
        connection_link_name: "paysimple",
    };
    ZFAPPS.request(client)
        .then(function (value) {
            console.log(value);
            try {
                let clients = JSON.parse(value.data.body)
                console.log(clients);
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
    console.log(value);
    await simplepayPaymentRunGet(value)

}

const payrunSelect = (value) => {
    let splitValue=value.split(",")
    paymentRunId = splitValue[0]
    journalDate=splitValue[1]
    console.log(paymentRunId);
    createJournalBtn.style.display="block"
    
}

const simplepayPaymentRunGet = async (id) => {
    let client = {
        url: `https://api.payroll.simplepay.cloud/v1/clients/${id}/payment_runs`,
        method: "GET",
        connection_link_name: "paysimple",
    };
    ZFAPPS.request(client)
        .then(function (value) {
            console.log(value);
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
                        option.value =`${pay.payment_run.id},${pay.payment_run.period_end_date}`
                        paymentRun[0].appendChild(option)
                    })
                }
                else {
                    paymentRunDiv.style.visibility = "hidden"
                    textareaDiv.style.visibility ="hidden"
                    ShowNotification("error", "There is no payrun data avilable for the selected company")
                }
                console.log(paymentRun[0]);

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
    createJournalBtn.disabled=true
    let textarea=document.getElementsByTagName("textarea")
    console.log(textarea[0].value);
    
    console.log(paymentRunId);   
   if(textarea[0].value!=""){
    let pay = {
        url: `https://api.payroll.simplepay.cloud/v1/payment_runs/${paymentRunId}/accounting`,
        method: "GET",
        connection_link_name: "paysimple",
    };
    ZFAPPS.request(pay)
        .then(async function (value) {
            try {
                payrunDetails=JSON.parse(value.data.body)
                await journalCreate(payrunDetails)
            }
            catch (err) {
                createJournalBtn.disabled=false
                console.error(err);
            }
        })
   }
   else{
    createJournalBtn.disabled=false
    ShowNotification("error", "Note Field cannot be empty")

   }
}
