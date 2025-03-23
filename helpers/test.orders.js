import { ObjectId } from 'mongodb'; 

export const testOrders = [
  {
    _id: new ObjectId("67a21938cf4efddf1e5358d1"),
    products: [
      new ObjectId("67a21772a6d9e00ef2ac022a"),
      new ObjectId("66db427fdb0119d9234b27f3"),
      new ObjectId("66db427fdb0119d9234b27f3")
    ],
    payment: {
      errors: {
        validationErrors: {},
        errorCollections: {
          transaction: {
            validationErrors: {
              amount: [
                {
                  attribute: "amount",
                  code: "81503",
                  message: "Amount is an invalid format."
                }
              ]
            },
            errorCollections: {
              creditCard: {
                validationErrors: {
                  number: [
                    {
                      attribute: "number",
                      code: "81717",
                      message: "Credit card number is not an accepted test number."
                    }
                  ]
                },
                errorCollections: {}
              }
            }
          }
        }
      },
      params: {
        transaction: {
          amount: "3004.9700000000003",
          paymentMethodNonce: "tokencc_bh_c36kjx_t6mnd5_c2mzrt_7rdc6j_nb4",
          options: {
            submitForSettlement: "true"
          },
          type: "sale"
        }
      },
      message: "Amount is an invalid format.\nCredit card number is not an accepted test number.",
      success: false
    },
    buyer: new ObjectId("67a218decf4efddf1e5358ac"),
    status: "Not Process",
    createdAt: new Date("2025-02-04T13:42:16.741Z"),
    updatedAt: new Date("2025-02-04T13:42:16.741Z"),
    __v: 0
  }
];
